import { Component, ViewChild } from '@angular/core';
import { TDrone3D } from '../Objects/Drone3D';
import { ThreeRenderComponent } from '../three-render/three-render.component';


@Component({
  selector: 'app-basic-scene',
  templateUrl: './basic-scene.component.html',
  styleUrls: ['./basic-scene.component.scss']
})
export class BasicSceneComponent {
  drone?: TDrone3D;

  @ViewChild(ThreeRenderComponent) render!: ThreeRenderComponent;

  public test1() {
    console.log('test1');
    const drone = new TDrone3D(2, 4, 0);

    this.drone=drone;
    const scene=this.render.Scene;
    if(!scene) return;
    const mesh=drone.Mesh;
    scene.add(mesh);
  }
}
