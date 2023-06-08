import { Component, OnDestroy, ViewChild } from '@angular/core';
import * as THREE from 'three';
import AdapterDroneTf from '../NetsIA/AdapterDroneTf';
import { Model1D } from '../NetsIA/ModelIA1D';
import { TReward } from '../NetsIA/TRewards';
import { TDrone3D, TTargetDrone } from '../Objects/Drone3D';
import { ThreeRenderComponent } from '../three-render/three-render.component';
import { TDroneMesh, TTargetMesh } from '../Objects/TDroneMesh';
import { ActionsMemory, IActionReward } from '../NetsIA/ActionsMemory';
import * as tf from '@tensorflow/tfjs';
import { TensorLike2D } from '@tensorflow/tfjs-core/dist/types';
import { DroneLearnContext, ICicleOptions } from '../NetsIA/DroneLearnContext';
import { Subject } from 'rxjs';
import { MinLapseTroller } from '../Objects/utils';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import GUI from 'lil-gui';


const Limits = {
  min: [-10, -10, 0],
  max: [10, 20, 10]
};

@Component({
  selector: 'app-basic-scene',
  templateUrl: './basic-scene.component.html',
  styleUrls: ['./basic-scene.component.scss']
})
export class BasicSceneComponent implements OnDestroy{
  
  private lastTimestap = 0;
  private learnCicleCount = new Subject<number>();
  /** Para poder manejar el calback de peticion de control al contexto */
  private minLapseAutopilot?: MinLapseTroller;
  miniMenuGui?:GUI;
  autoPilotOn = false;
  drone?: TDrone3D;
  droneMesh?: TDroneMesh;
  targetDrone?: TTargetDrone;
  targetMesh?: TTargetMesh;
  /** Limites de la escena actual por donde se mueve el drone */
  sceneLimits = new THREE.Box3(new THREE.Vector3(-12, 0, -12), new THREE.Vector3(12, 12, 12));
  droneLearnCtx?: DroneLearnContext;
  /** Numero de ciclos de aprendizaje con cada click */
  numCicles = 1;
  /** Cuenta de ciclos de aprendizaje realizados */
  ciclesCount = 0;
  bussy = false;
  /** Probabilidad en cada paso de seleccionar un valor aleatorio */
  exploracionFactor = 0.05;


  @ViewChild(ThreeRenderComponent) render!: ThreeRenderComponent;

  public get RotX(): number { return this.drone?.RotationX ?? 0; }
  public set RotX(v: number) {
    if (!this.drone) return;
    this.drone.RotationX = v;
  }
  public get RotY(): number { return this.drone?.RotationY ?? 0; }
  public set RotY(v: number) {
    if (!this.drone) return;
    this.drone.RotationY = v;
  }
  public get RotZ(): number { return this.drone?.RotationZ ?? 0; }
  public set RotZ(v: number) {
    if (!this.drone) return;
    this.drone.RotationZ = v;
  }

  public get TotalForce(): number { return this.drone?.TotalForce ?? 0; }
  public set TotalForce(v: number) { if (this.drone) this.drone.TotalForce = v; }
  public get PitchBalance(): number { return this.drone?.PithBalance ?? 0; }
  public set PitchBalance(v: number) { if (this.drone) this.drone.PithBalance = v; }

  /** Otorga la recompensa a un dron en base a su estado puntual en un momento */
  jury: TReward | undefined;
  model1D: Model1D | undefined;

  /** Informa de que se aunmento el número de ciclos de aprendizaje */
  public LearnCicleCount$ = this.learnCicleCount.asObservable();

  ngOnDestroy(): void {
    if(this.miniMenuGui){
      this.miniMenuGui.destroy();
      this.miniMenuGui=undefined;
    }
  }



  public test1() {
    console.log('test1');
    if (this.drone) return;
    const drone = new TDrone3D(0, 4, 0);

    this.drone = drone;
    this.droneMesh = new TDroneMesh(drone);
    
    const scene = this.render.Scene;
    if (!scene) return;
    const mesh = this.droneMesh.Mesh;
    scene.add(mesh);

    if (!this.targetDrone) {
      this.targetDrone=new TTargetDrone(6);
      this.targetMesh = new TTargetMesh(this.targetDrone);
      scene.add(this.targetMesh.VisualObj);
    }
    
    this.createMenuLIL();
    //scene.add(drone.Arrow);
    this.render.CalbackRenderLoop = (SgElapsed: number) => this.beforeRenderFrame(SgElapsed);
  }

  public test2() {
    const v1b = new THREE.Vector3();
    const v1 = new THREE.Vector3(1, 0, 1);
    const euler = new THREE.Euler(Math.PI / 4, 0, Math.PI / 2, "ZXY");

    v1b.copy(v1);
    const v2 = v1b.applyEuler(euler);
    console.log(`v1:${BasicSceneComponent.V3ToString(v1)}  v2:${BasicSceneComponent.V3ToString(v2)}`);
  }

  public resetDrone() {
    this.drone?.Reset();
  }


  /**Cuando se activa o desactiva el  */
  public btnAutoPilotChanged($event: MatSlideToggleChange) {
    const { checked } = $event;
    if (checked) {
      if (!this.minLapseAutopilot) {
        this.minLapseAutopilot = new MinLapseTroller(0.1);
      }
    } else {
      this.minLapseAutopilot = undefined;
    }
  }

  public static V3ToString(v: THREE.Vector3) {
    return `[${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}]`;
  }

  private beforeRenderFrame(SgElapsed: number) {
    if (this.lastTimestap === 0) this.lastTimestap = SgElapsed - 0.04;
    let dif = SgElapsed - this.lastTimestap;
    this.lastTimestap = SgElapsed;
    if (dif > 0.1) dif = 0.1;  // Bolqueo para poder depurar    
    if (!this.drone) return;
    this.minLapseAutopilot?.ejecute(SgElapsed, () => { this.droneLearnCtx?.controlDrone(); });
    this.drone.Simulate(SgElapsed);
    this.droneMesh?.updateFromDrone();
  }


  /* public async testCicle() {
    if (!this.drone) return;
    if (!this.jury) {
      this.jury = new TReward();
    }
    if (!this.model1D) {
      this.model1D = new Model1D();
      this.model1D.createModel2();
    }
    const adapter = new AdapterDroneTf(this.drone);
    const am: ActionsMemory = new ActionsMemory(500);
    let cicleCount = 0;
    const MaxCicles = 150;
    let isDone = false;
    let isInside = true;
    while (cicleCount < MaxCicles && !isDone && isInside) {
      const droneState = adapter.getStateTensor();
      const r = this.model1D.predict(droneState);
      //console.log(r);
      const info = adapter.setControlData(r);
      //Ciclos de simulación del objeto
      this.drone.Simulate(0.1); //Simulamos en pasos de 100ms

      const reward = this.jury.InstanReward(this.drone);
      if (cicleCount % 4 === 0) {
        console.log(`${cicleCount} -> pos:[${this.drone.Position.y}] vel:[${this.drone.Velocity.y}] rew:${reward}`);
      }
      cicleCount++;
      isInside = this.IsInBoundLimits(this.drone);
      if (r && info) {
        const d: IActionReward = {
          currentState: droneState,
          action: r,
          reward,
          info
        };
        am.add(d);
      }
      isDone = this.jury.IsDone(this.drone);
    }
    console.log('Fuera de los limites');
    let lastReward = 0;
    if (!isInside) lastReward = this.jury.badReward;
    if (isDone) lastReward = this.jury.goodReward;
    am.finalize(lastReward);
    await this.replayAndTrain(am, this.model1D);
    am.dispose();
  } */

  public async testDroneContext() {
    if (!this.drone || this.bussy) return;
    this.bussy = true;
    this.minLapseAutopilot = undefined;
    console.clear();

    if (!this.drone) return;
    if (!this.droneLearnCtx) this.droneLearnCtx = new DroneLearnContext(this.drone);
    const opt: ICicleOptions = { explorationF: this.exploracionFactor };
    for (let i = 0; i < this.numCicles; i++) {
      await this.droneLearnCtx.LearnCicle(opt);
    }
    this.ciclesCount += this.numCicles;
    this.learnCicleCount.next(this.ciclesCount);
    this.bussy = false;

    //void this.droneLearnCtx.LearnDummy();
  }

  public viewLearningGraph() {
    console.warn('nada');
  }

  /**
   * Devuelve true si está en la escena
   * @param drone 
   * @returns 
   */
  private IsInBoundLimits(drone: TDrone3D): boolean {
    return this.sceneLimits.containsPoint(drone.Position);
  }


  private async replayAndTrain(am: ActionsMemory<tf.Tensor2D, tf.Tensor2D>, model1D: Model1D) {
    /* const d1=[ [ 1, 2, 3 ], [ 4, 5, 6 ] ];
    const example1 = tf.tensor2d(d1);
    const example2 = tf.tensor2d({values: d1}); */

    const batchSize = 100;
    /* Tenemos outputNumActions como posibles salidas, cada una de ellas tendrá una recompensa prevista, lo que queremos
    es entrenar la red para que maneje */
    let i = 0;

    const batch = am.getAllSamples();
    const x0: number[][] = [];
    const y0: number[][] = []; //
    const gamma = 0.9;

    batch.forEach((d) => {
      const state = d.current.currentState.dataSync();  //Un array con 2 valores float
      const staten = Array.from(state);
      x0.push(staten);
      //Se modifica la recompensa del action tomado en este paso con la recompensa que se obtiene del siguiente paso
      //const yy=d.current.action.toFloat
      //Como no se puede modificar un dato de un tensor, hay que exportarlo, modificarlo y volver a crearlo.
      /* const buffer = tf.buffer(d.current.action.shape, d.current.action.dtype, d.current.action.dataSync());
      buffer.toTensor() */
      const currentQ = d.current.action.dataSync(); //Array con 5 floats
      const indexOfAction = d.current.info.indexActionY;
      const reward = d.current.reward + gamma * d.nextMaxReward;
      currentQ[indexOfAction] = reward; //buffer.set(reward, indexOfAction); //actions[indexOfAction]=reward
      //const t = buffer.toTensor() as tf.Tensor2D;  //Se reconvierte a tensor
      y0.push(Array.from(currentQ));
    });
    const xs = tf.tensor2d(x0, [x0.length, model1D.inputNumStates]); //Tensor con 100 (samples) * 2 valores
    const ys = tf.tensor2d(y0, [y0.length, model1D.outputNumActions]); //Tensor con 100 (samples) * 5 valores
    //Hay que entrenar el modelo con entradas igual a los estados almacenados y como salidas deseadas correspondiente a cada entrada el array de estados
    // eslint-disable-next-line no-await-in-loop
    const h = await model1D.train(xs, ys);
    console.log(h);
    //model1D.model?.fit()
    xs.dispose();
    ys.dispose();
    i++;
  }

  private createMenuLIL(){
    if(this.miniMenuGui) return;
    const gui=new GUI();
    this.miniMenuGui = gui;    
    if(this.drone){
     const folderDrone=gui.addFolder( 'Drone' );
     const folderPos=folderDrone.addFolder('Position');
     folderPos.add(this.drone.Position, 'y').listen().decimals(2 ).disable(); 
     const folderVel=folderDrone.addFolder('Velocity');
     folderVel.add(this.drone.Velocity, 'y',-4,4).listen().decimals(2 ).disable(); 
    }
    if(this.targetDrone){
      const folderTarget=gui.addFolder('Target');
      folderTarget.add(this.targetDrone,'y', 1, 9, 0.5).onChange((v:number)=>{ 
        this.setTargetPos(v);
      });
    }
  }

  private setTargetPos(y:number){
    if(this.targetDrone){
      this.targetDrone.y=y;
      this.targetMesh?.updateFromController();
    }
    if(this.droneLearnCtx){
      this.droneLearnCtx.targetY=y;
    }
  }
}
