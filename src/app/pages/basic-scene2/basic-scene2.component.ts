import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import GUI from 'lil-gui';
import { Subject } from 'rxjs';
import { DroneLearnContext } from 'src/app/NetsIA/DroneLearnContext';
import { TDrone3D, TTargetDrone } from 'src/app/Objects/Drone3D';
import { TDroneMesh, TTargetMesh } from 'src/app/Objects/TDroneMesh';
import { MinLapseTroller } from 'src/app/Objects/utils';
import { ThreeRenderComponent } from 'src/app/three-render/three-render.component';
import * as THREE from 'three';
import { BasicSceneBase } from '../basicSceneBase';
import { AdapterDroneTf2 } from 'src/app/NetsIA/AdapterDroneTf';
import { Model1D2 } from 'src/app/NetsIA/ModelIA1D';


/**
 * Manejo de la posición del dron en 1D, pero usando solo 3 posibles estados de salida, que serían si sube la potencia, mantiene o baja.
 */
@Component({
  selector: 'app-basic-scene2',
  templateUrl: './basic-scene2.component.html',
  styleUrls: ['./basic-scene2.component.scss']
})
export class BasicScene2Component extends BasicSceneBase implements OnInit, AfterViewInit, OnDestroy { 
  private lastTimestap = 0;
  payload = 0;
  @ViewChild(ThreeRenderComponent) render!: ThreeRenderComponent;

  /** Informa de que se aunmento el número de ciclos de aprendizaje */
  public LearnCicleCount$ = this.learnCicleCount.asObservable();



  ngOnInit(): void {
    console.log('OnInit');
  }

  ngAfterViewInit(): void {
    this.createObjectsDrone();
  }

  ngOnDestroy(): void {
    this.dispose();    
  }

  public async saveModel(){
    if(!this.droneLearnCtx) return;
    const tfModel=this.droneLearnCtx.NetModel.model;
    if(!tfModel) return;
    const s1=await tfModel.save('localstorage://my-model');
    const s2=await tfModel.save('indexeddb://my-model');

    //this.model.getWeights(); permite obtener los pesos como tensores
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

  protected override getDroneContext():DroneLearnContext{
    if(!this.drone) throw new Error('Undefined drone');
    const createAdapter= ()=>{
      if(!this.drone) throw new Error('Undefined drone');
      return new AdapterDroneTf2(this.drone);
    };
    return new DroneLearnContext(this.drone, ()=>{return new Model1D2();}, createAdapter);
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
    const gui = new GUI();
    this.miniMenuGui = gui;
    if (this.drone) {
      const folderDrone = gui.addFolder('Drone');
      const folderPos = folderDrone.addFolder('Position');
      folderPos.add(this.drone.Position, 'y').listen().decimals(2).disable();
      const folderVel = folderDrone.addFolder('Velocity');
      folderVel.add(this.drone.Velocity, 'y', -4, 4).listen().decimals(2).disable();
      const folderAcc = folderDrone.addFolder('Acceleration');
      folderAcc.add(this.drone.NetForce, 'y', -2, 2).listen().decimals(2).disable();
      folderAcc.add(this.drone.NetForce, 'x', -2, 2).listen().decimals(2).disable();
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
      this.droneLearnCtx.targetY = y;
    }
  }

  private setPayload(v: number) {
    this.payload = v;
    if (this.drone) {
      this.drone.Payload = v;
    }
  }

}
