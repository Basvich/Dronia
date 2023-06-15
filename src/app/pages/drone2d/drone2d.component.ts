import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BasicSceneBase } from '../basicSceneBase';
import { ThreeRenderComponent } from 'src/app/three-render/three-render.component';
import { TDrone3D, TTargetDrone } from 'src/app/Objects/Drone3D';
import { TDroneMesh, TTargetMesh } from 'src/app/Objects/TDroneMesh';
import { DroneLearn3DContext, DroneLearnContext, ICicleOptions } from 'src/app/NetsIA/DroneLearnContext';
import { AdapterDrone2D, AdapterDroneTf2 } from 'src/app/NetsIA/AdapterDroneTf';
import { ModelDron2D } from 'src/app/NetsIA/ModelIA1D';
import GUI from 'lil-gui';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MinLapseTroller } from 'src/app/Objects/utils';
import { Subject } from 'rxjs';
import * as THREE from 'three';
import { AdamaxOptimizer } from '@tensorflow/tfjs';

@Component({
  selector: 'app-drone2d',
  templateUrl: './drone2d.component.html',
  styleUrls: ['./drone2d.component.scss']
})
export class Drone2dComponent implements OnInit, AfterViewInit, OnDestroy {
  protected learnCicleCount = new Subject<{ count: number, lost: number }>();
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
    this.createObjectsDrone();
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

  public async testDroneLearnContext() {
    if (!this.drone || this.bussy) return;
    this.bussy = true;
    this.minLapseAutopilot = undefined;
    console.clear();

    if (!this.drone) return;
    if (!this.droneLearnCtx) this.droneLearnCtx = this.getDroneContext();
    const opt: ICicleOptions = {
      explorationF: this.exploracionFactor,
      initialsPos: this.initialsPosIterator
    };
    for (let i = 0; i < this.numCicles; i++) {
      console.clear();
      await this.droneLearnCtx.LearnCicle(opt);
    }
    this.ciclesCount += this.numCicles;
    this.learnCicleCount.next({ count: this.ciclesCount, lost: 0 });
    this.bussy = false;

    //void this.droneLearnCtx.LearnDummy();
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
    const gui = new GUI();
    this.miniMenuGui = gui;
    if (this.drone) {
      const folderDrone = gui.addFolder('Drone');
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
      this.droneLearnCtx.targetPos.y=y;
    }
  }

  private setPayload(v: number) {
    this.payload = v;
    if (this.drone) {
      this.drone.Payload = v;
    }
  }
}
