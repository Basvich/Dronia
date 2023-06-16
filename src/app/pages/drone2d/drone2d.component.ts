import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ThreeRenderComponent } from 'src/app/three-render/three-render.component';
import { TDrone3D, TTargetDrone } from 'src/app/Objects/Drone3D';
import { TDroneMesh, TTargetMesh } from 'src/app/Objects/TDroneMesh';
import { ICicle3DOptions, LearnInfo } from 'src/app/NetsIA/DroneLearnContext';
import { AdapterDrone2D } from 'src/app/NetsIA/AdapterDroneTf';
import { ModelDron2D } from 'src/app/NetsIA/ModelIA1D';
import GUI from 'lil-gui';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MinLapseTroller, Random } from 'src/app/Objects/utils';
import { Subject } from 'rxjs';
import * as THREE from 'three';
import * as tf from '@tensorflow/tfjs';
import { DroneLearn3DContext } from 'src/app/NetsIA/DroneLearn3DContext';

@Component({
  selector: 'app-drone2d',
  templateUrl: './drone2d.component.html',
  styleUrls: ['./drone2d.component.scss']
})
export class Drone2dComponent implements OnInit, AfterViewInit, OnDestroy {
  modelName='Model2D';
  protected learnCicleCount = new Subject<LearnInfo>();
  private lastTimestap = 0;
  /** Para poder manejar el calback de peticion de control al contexto */
  protected minLapseAutopilot?: MinLapseTroller;
  miniMenuGui?: GUI;
  drone?: TDrone3D;
  droneMesh?: TDroneMesh;
  targetMesh?: TTargetMesh;
  targetDrone?: TTargetDrone;
  droneLearnCtx?: DroneLearn3DContext;
  bussy = false;
  payload = 0;
  /** Limites de la escena actual por donde se mueve el drone */
  sceneLimits = new THREE.Box3(new THREE.Vector3(-12, -12, -12), new THREE.Vector3(12, 12, 12));
  /** Probabilidad en cada paso de seleccionar un valor aleatorio */
  exploracionFactor = 0.05;
  /** Numero de ciclos de aprendizaje con cada click */
  numCicles = 1;
  /** Cuenta de ciclos de aprendizaje realizados */
  ciclesCount = 0;
  autoPilotOn = false;
  prefixInitials = false;
  initialsPosIterator?: Iterator<{ posY: number, velY: number }>;
  private fixedInitialPos?: Array<{ posY: number, velY: number }>;
  @ViewChild(ThreeRenderComponent) render!: ThreeRenderComponent;
  @ViewChild("GUI1") GUI1Element!: ElementRef<HTMLElement>;

  /** Informa de que se aunmento el número de ciclos de aprendizaje */
  public LearnCicleCount$ = this.learnCicleCount.asObservable();

  public get TotalForce(): number { return this.drone?.TotalForce ?? 0; }
  public set TotalForce(v: number) { if (this.drone) this.drone.TotalForce = v; }
  public get PitchBalance(): number { return this.drone?.PithBalance ?? 0; }
  public set PitchBalance(v: number) { if (this.drone) this.drone.PithBalance = v; }

  ngOnInit(): void {
    console.log('OnInit');
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.createObjectsDrone();
      if (!this.droneLearnCtx) this.droneLearnCtx = this.getDroneContext();
    }, 500);    
  }

  ngOnDestroy(): void {
    this.dispose();
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

  public resetDrone() {
    this.drone?.Reset();
  }

  public randomResetDrone() {
    if (!this.drone) return;
    this.drone.Reset();
    const pos = [Random.gaussianRandom(0, 3), Random.gaussianRandom(6, 5), 0];
    const vel = [0, Random.gaussianRandom(0, 2), 0];
    const pitch = Random.gaussianRandom(0, 0.5);

    this.drone.Position.set(pos[0], pos[1], pos[2]);
    this.drone.Velocity.set(vel[0], vel[1], vel[2]);
    this.drone.Pitch = pitch;
  }

  public async testDroneLearnContext() {
    const infos:LearnInfo[]=[];
    const createInfo=(cicleCount:number)=>{
      const red=infos.reduce((acum, value)=>{return {sLoss:acum.sLoss+value.loss, sTeps: acum.sTeps+value.stepsCount};}, {sLoss:0, sTeps:0});
      const res:LearnInfo={        
          cicleCount,
          loss: red.sLoss/infos.length,
          stepsCount: red.sTeps/infos.length
      };
      return res;      
    };
    const lastLoss=(hist:tf.History)=>{
      const losses=hist.history['loss'] as number[];
      const last=losses[losses.length-1]??-1;
      return last;
    };
    if (!this.drone || this.bussy) return;
    this.bussy = true;
    this.minLapseAutopilot = undefined;
    console.clear();

    if (!this.drone) return;
    if (!this.droneLearnCtx) this.droneLearnCtx = this.getDroneContext();
    const opt: ICicle3DOptions = {
      explorationF: this.exploracionFactor,
      initialsPos: undefined //this.initialsPosIterator
    };    
    
    for (let i = 0; i < this.numCicles; i++) {
      console.clear();
      const r=await this.droneLearnCtx.LearnCicleAgregated(opt); //await this.droneLearnCtx.LearnCicle(opt);
      infos.push({
        cicleCount: 0,
        loss: lastLoss(r.history),
        stepsCount: r.steps
      });
      if(infos.length===10){
        const nfo=createInfo(this.ciclesCount+i+1);
        this.learnCicleCount.next(nfo);
        infos.length=0;
      }
    }
    this.ciclesCount += this.numCicles;
    if(infos.length>0){
      const nfo=createInfo(this.ciclesCount);    
      this.learnCicleCount.next(nfo);      
    }
    this.bussy = false;

    //void this.droneLearnCtx.LearnDummy();
  }

  public async saveModel(){
    if(!this.droneLearnCtx) return;
    const tfModel=this.droneLearnCtx.NetModel.model;
    if(!tfModel) return;
    //const s1=await tfModel.save('localstorage://my-model');
    const s2=await tfModel.save(`indexeddb://${this.modelName}`);

    //this.model.getWeights(); permite obtener los pesos como tensores
  }

  /**
   * Recupera el modelo. En estado experimental
   * @returns 
   */
  public async loadModel(){
    if(!this.droneLearnCtx) return;
    const tfModel=this.droneLearnCtx.NetModel.model;
    if(!tfModel) return;
    const model = await tf.loadLayersModel(`indexeddb://${this.modelName}`);
    if(model){
      model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
      this.droneLearnCtx.NetModel.model=model;
    }
  }

  public handlePrefixInitials() {
    if (this.prefixInitials) {
      this.initialsPosIterator = this.PrefixedInitials();
    } else {
      this.initialsPosIterator = undefined;
    }
  }

  public *PrefixedInitials(): Generator<{ posY: number; velY: number; }, void, unknown> {
    if (!this.fixedInitialPos) {
      this.fixedInitialPos = [];
      for (let posY = 0; posY <= 10; posY += 0.5) { //24 por m
        for (let velY = -3; velY <= 3; velY += 0.5) { //12 por vel
          this.fixedInitialPos?.push({ posY, velY });
        }
      }
    }
    while (true) {
      for (let i = 0; i < this.fixedInitialPos?.length; i++) {
        yield this.fixedInitialPos[i];
      }
    }
  }


  public dispose() {
    if (this.droneLearnCtx) {
      this.droneLearnCtx.Dispose();
      this.droneLearnCtx = undefined;
    }
    if (this.miniMenuGui) {
      this.miniMenuGui.destroy();
      this.miniMenuGui = undefined;
    }
  }

  private createObjectsDrone() {
    console.log('test1');
    if (this.drone) return;
    const drone = new TDrone3D(0, 4, 0);

    this.drone = drone;
    this.droneMesh = new TDroneMesh(drone);

    const scene = this.render.Scene;
    if (!scene) {
      console.error('No scene found');
      return;
    }
    const mesh = this.droneMesh.Mesh;
    scene.add(mesh);

    if (!this.targetDrone) {
      this.targetDrone = new TTargetDrone(6);
      this.targetMesh = new TTargetMesh(this.targetDrone);
      scene.add(this.targetMesh.VisualObj);
    }

    this.createMenuLIL();
    //scene.add(drone.Arrow);
    this.render.CalbackRenderLoop = (SgElapsed: number) => this.beforeRenderFrame(SgElapsed);
  }

  protected getDroneContext(): DroneLearn3DContext {
    if (!this.drone) throw new Error('Undefined drone');
    const createAdapter = () => {
      if (!this.drone) throw new Error('Undefined drone');
      return new AdapterDrone2D(this.drone);
    };
    return new DroneLearn3DContext(this.drone, () => { return new ModelDron2D(); }, createAdapter);
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

  private createMenuLIL() {
    if (this.miniMenuGui) return;
    let parent=document.getElementById('GUI1');
    if(!parent) parent=this.GUI1Element.nativeElement;
    const gui = new GUI();
    this.miniMenuGui = gui;
    if (this.drone) {
      const folderDrone = gui.addFolder('Drone');
      const folderControl=folderDrone.addFolder('Control');
      folderControl.add(this,'TotalForce',0, 20, 2).listen();
      folderControl.add(this,'PitchBalance', -0.4, 0.4, 0.05).listen();
      const folderPos = folderDrone.addFolder('Position');
      folderPos.add(this.drone.Position, 'x').listen().decimals(2).disable();
      folderPos.add(this.drone.Position, 'y').listen().decimals(2).disable();
      const folderVel = folderDrone.addFolder('Velocity');      
      folderVel.add(this.drone.Velocity, 'x', -4, 4).listen().decimals(2).disable();      
      folderVel.add(this.drone.Velocity, 'y', -4, 4).listen().decimals(2).disable();
      const folderAcc = folderDrone.addFolder('Acceleration');
      folderAcc.add(this.drone.NetForce, 'x', -2, 2).listen().decimals(2).disable();
      folderAcc.add(this.drone.NetForce, 'y', -2, 2).listen().decimals(2).disable();
    }
    if (this.targetDrone) {
      const folderTarget = gui.addFolder('Target').close();
      folderTarget.add(this.targetDrone, 'y', 1, 9, 0.5).onChange((v: number) => {
        this.setTargetPos(v);
      });
      folderTarget.add(this, 'payload', 0, 1, 0.1).onChange((v: number) => {
        this.setPayload(v);
      });
    }
  }

  private setTargetPos(y: number) {
    if (this.targetDrone) {
      this.targetDrone.y = y;
      this.targetMesh?.updateFromController();
    }
    if (this.droneLearnCtx) {
      this.droneLearnCtx.targetPos.y = y;
    }
  }

  private setPayload(v: number) {
    this.payload = v;
    if (this.drone) {
      this.drone.Payload = v;
    }
  }
}
