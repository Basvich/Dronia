import { Component, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { Vector2 } from 'three';
import { TDrone3D } from '../Objects/Drone3D';
import { ThreeRenderComponent } from '../three-render/three-render.component';


@Component({
  selector: 'app-basic-scene',
  templateUrl: './basic-scene.component.html',
  styleUrls: ['./basic-scene.component.scss']
})
export class BasicSceneComponent {
  private lastTimestap=0;
  drone?: TDrone3D;

  @ViewChild(ThreeRenderComponent) render!: ThreeRenderComponent;

  public get RotX():number{ return this.drone?.RotationX??0;}
  public set RotX(v:number){ 
    if(!this.drone) return;
    this.drone.RotationX=v;
  }
  public get RotY():number{ return this.drone?.RotationY??0;}
  public set RotY(v:number){ 
    if(!this.drone) return;
    this.drone.RotationY=v;
  }
  public get RotZ():number{ return this.drone?.RotationZ??0;}
  public set RotZ(v:number){ 
    if(!this.drone) return;
    this.drone.RotationZ=v;
  }

  public get TotalForce():number{return this.drone?.TotalForce??0}
  public set TotalForce(v:number){if(this.drone) this.drone.TotalForce=v}
  public get PitchBalance():number{return this.drone?.PithBalance??0}
  public set PitchBalance(v:number){if(this.drone) this.drone.PithBalance=v}

  public test1() {
    console.log('test1');
    if(this.drone) return;
    const drone = new TDrone3D(2, 4, 0);


    this.drone=drone;
    const scene=this.render.Scene;
    if(!scene) return;
    const mesh=drone.Mesh;
    scene.add(mesh);
    scene.add(drone.Arrow);
    this.render.CalbackRenderLoop=(ms:number)=>this.beforeRenderFrame(ms);
  }

  public test2(){
    const v1b=new THREE.Vector3();
    const v1=new THREE.Vector3(1,0,1);
    const euler=new THREE.Euler(Math.PI / 4, 0, Math.PI / 2, "ZXY");
    
    v1b.copy(v1);
    const v2=v1b.applyEuler(euler);
    console.log(`v1:${BasicSceneComponent.V3ToString(v1)}  v2:${BasicSceneComponent.V3ToString(v2)}`)
  }

  public resetDrone(){
    this.drone?.Reset();
  }

  public static V3ToString(v:THREE.Vector3)   {
    return `[${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)},]`;
  }

  private beforeRenderFrame(ms:number){
    
    if(this.lastTimestap==0) this.lastTimestap=ms-16;
    let dif=ms-this.lastTimestap;
    this.lastTimestap=ms;
    if(dif>100) dif=100;  // Bolqueo para poder depurar
    const sg=dif*0.001;
    if(!this.drone) return;    
    this.drone.Simulate(sg);
  }
}
