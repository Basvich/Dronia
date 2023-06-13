import { Component, OnDestroy, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { Model1D } from '../NetsIA/ModelIA1D';
import { TReward } from '../NetsIA/TRewards';
import { TDrone3D, TTargetDrone } from '../Objects/Drone3D';
import { ThreeRenderComponent } from '../three-render/three-render.component';
import { TDroneMesh, TTargetMesh } from '../Objects/TDroneMesh';
import { DroneLearnContext, ICicleOptions } from '../NetsIA/DroneLearnContext';
import { Subject } from 'rxjs';
import { MinLapseTroller } from '../Objects/utils';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import GUI from 'lil-gui';
import { BasicSceneBase } from '../pages/basicSceneBase';


const Limits = {
  min: [-10, -10, 0],
  max: [10, 20, 10]
};

@Component({
  selector: 'app-basic-scene',
  templateUrl: './basic-scene.component.html',
  styleUrls: ['./basic-scene.component.scss']
})
export class BasicSceneComponent  extends BasicSceneBase  implements OnDestroy {  
  private lastTimestap = 0;  
  payload=0; 

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

  /** Otorga la recompensa a un dron en base a su estado puntual en un momento */
  jury: TReward | undefined;
  model1D: Model1D | undefined;

  /** Informa de que se aunmento el número de ciclos de aprendizaje */
  public LearnCicleCount$ = this.learnCicleCount.asObservable();

  ngOnDestroy(): void {
    this.dispose();
    if(this.miniMenuGui){
      this.miniMenuGui.destroy();
      this.miniMenuGui=undefined;
    }        
  }



  public createObjectsDrone() {
    console.log('createObjectsDrone()');
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
     const folderAcc=folderDrone.addFolder('Acceleration');     
     folderAcc.add(this.drone.NetForce, 'y', -2, 2).listen().decimals(2 ).disable(); 
     folderAcc.add(this.drone.NetForce, 'x', -2, 2).listen().decimals(2 ).disable(); 
    }
    if(this.targetDrone){
      const folderTarget=gui.addFolder('Target').close();
      folderTarget.add(this.targetDrone,'y', 1, 9, 0.5).onChange((v:number)=>{ 
        this.setTargetPos(v);
      }); 
      folderTarget.add(this,'payload', 0, 1, 0.1).onChange((v:number)=>{
        this.setPayload(v);
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

  private setPayload(v:number){
    this.payload=v;
    if(this.drone){
      this.drone.Payload=v;
    }
  }

  
}
