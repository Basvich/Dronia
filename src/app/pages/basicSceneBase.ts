import { Subject } from "rxjs";
import { TDrone3D, TTargetDrone } from "../Objects/Drone3D";
import { TDroneMesh, TTargetMesh } from "../Objects/TDroneMesh";
import { IDisposable, MinLapseTroller } from "../Objects/utils";
import GUI from "lil-gui";
import * as THREE from "three";
import { DroneLearnContext, ICicleOptions } from "../NetsIA/DroneLearnContext";
import { Model1D } from "../NetsIA/ModelIA1D";
import AdapterDroneTf from "../NetsIA/AdapterDroneTf";


/** Clase base para unas páginas casi iguales en 1D, donde metemos las cosas comunes */
export class BasicSceneBase implements IDisposable {
  protected learnCicleCount = new Subject<{count:number, lost:number}>();
  /** Para poder manejar el calback de peticion de control al contexto */
  protected minLapseAutopilot?: MinLapseTroller;
  miniMenuGui?: GUI;

  drone?: TDrone3D;
  droneMesh?: TDroneMesh;
  targetMesh?: TTargetMesh;
  targetDrone?: TTargetDrone;
  droneLearnCtx?: DroneLearnContext;
  bussy = false;

  /** Limites de la escena actual por donde se mueve el drone */
  sceneLimits = new THREE.Box3(new THREE.Vector3(-12, -12, -12), new THREE.Vector3(12, 12, 12));
  /** Probabilidad en cada paso de seleccionar un valor aleatorio */
  exploracionFactor = 0.05;
  /** Numero de ciclos de aprendizaje con cada click */
  numCicles = 1;
  /** Cuenta de ciclos de aprendizaje realizados */
  ciclesCount = 0;
  autoPilotOn = false;
  prefixInitials=false;
  initialsPosIterator?: Iterator<{posY:number, velY:number}>;
  private fixedInitialPos?: Array<{posY:number, velY:number}>;

  public get TotalForce(): number { return this.drone?.TotalForce ?? 0; }
  public set TotalForce(v: number) { if (this.drone) this.drone.TotalForce = v; }
  public get PitchBalance(): number { return this.drone?.PithBalance ?? 0; }
  public set PitchBalance(v: number) { if (this.drone) this.drone.PithBalance = v; }

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
    this.learnCicleCount.next({count:this.ciclesCount, lost:0});
    this.bussy = false;

    //void this.droneLearnCtx.LearnDummy();
  }

  public handlePrefixInitials(){
    if(this.prefixInitials){
      this.initialsPosIterator=this.PrefixedInitials();
    }else{
      this.initialsPosIterator=undefined;
    }     
  }

  public *PrefixedInitials(): Generator<{ posY: number; velY: number; }, void, unknown>{
    if(!this.fixedInitialPos){
      this.fixedInitialPos=[];
      for(let posY=0; posY<=10; posY+=0.5){ //24 por m
        for(let velY=-3; velY<=3; velY+=0.5){ //12 por vel
          this.fixedInitialPos?.push({posY,velY});
        }
      }
    }
    while(true){
      for(let i=0; i< this.fixedInitialPos?.length; i++){
        yield this.fixedInitialPos[i];
      }
    }
  }



  protected getDroneContext():DroneLearnContext{
    if(!this.drone) throw new Error('Undefined drone');
    return new DroneLearnContext(this.drone, ()=>{return new Model1D();}, ()=>{return new AdapterDroneTf(this.drone!);});
  }

  public dispose(){
    if(this.droneLearnCtx){
      this.droneLearnCtx.Dispose();
      this.droneLearnCtx=undefined;
    }
    if(this.miniMenuGui){
      this.miniMenuGui.destroy();
      this.miniMenuGui=undefined;
    }
  }
}