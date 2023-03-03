import { Component, OnInit } from '@angular/core';
import * as THREE from 'three';
import { BufferAttribute } from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

@Component({
  selector: 'app-basic-scene',
  templateUrl: './basic-scene.component.html',
  styleUrls: ['./basic-scene.component.scss']
})
export class BasicSceneComponent implements OnInit {
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private camControl?: OrbitControls;
  private sunLight?: THREE.DirectionalLight;
  /** El mesh del terreno */
  private terrainMesh?: THREE.Mesh;
  private earthMesh?: THREE.Object3D;
  // an array of objects who's rotation to update
  private objects: THREE.Object3D[] = [];
  /** El mesh del terreno */


  ngOnInit(): void {
    const canvas = <HTMLCanvasElement>document.querySelector('#c');
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;        //  THREE.PCFSoftShadowMap; //
  }

  public test1() {
    this.createScene();
    setTimeout(() => {
      console.log("hola");
      this.startWebGl();
    }, 0);
  }

  public startWebGl(): void {
    // Solicita al navegador que programe el repintado de la ventana
    requestAnimationFrame(this.render?.bind(this));
  }

  private createScene() {
    const fov = 40;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 1000;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    //Posicion inicial de la camara
    this.camera.position.set(0, -12, 10);
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);
    //const cameraHelper = new THREE.CameraHelper( this.camera );
    //this.scene.add( cameraHelper );

    this.camControl = new OrbitControls(this.camera, this.renderer?.domElement);
    this.camControl.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    this.camControl.dampingFactor = 0.05;
    this.camControl.screenSpacePanning = true;
    this.camControl.minDistance = 1;
    this.camControl.maxDistance = 200;
    this.camControl.enablePan = true;
    this.camControl.keyPanSpeed = 7.0;	// pixels moved per arrow key push
    //this.camControl.enableKeys = true;
    //this.camControl.maxPolarAngle = Math.PI / 2;


    this.scene = new THREE.Scene();
    {
      //const color = 0xFFFFFF;
      //const intensity = 2;
      //const light = new THREE.PointLight(color, intensity, 100);
      //light.castShadow=true;
      //Set up shadow properties for the light
      //light.shadow.mapSize.width = 512; // default
      //light.shadow.mapSize.height = 512; // default
      //light.position.set(-10,3,6);
      //this.scene.add(light);
    }

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(0, 300, 0);
    this.sunLight.position.applyEuler(new THREE.Euler(Math.PI / 4, 0, 0, 'XYZ'));

    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.bias = -0.0005;
    const d = 250;
    this.sunLight.shadow.camera = new THREE.OrthographicCamera(-d, d, d, -d, 10, 2000);

    this.sunLight.name = "sunLight";
    this.scene.add(this.sunLight);

    /* const cameraHelper = new THREE.CameraHelper( this.sunLight.shadow.camera );
    this.scene.add( cameraHelper );
 */
    /* const sunLightHelper=new THREE.DirectionalLightHelper(this.sunLight, 5);
    this.scene.add(sunLightHelper); */

    const skyLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
    this.scene.add(skyLight);

    const radius = 1;
    const widthSegments = 6;
    const heightSegments = 6;
    const sphereGeometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);

    const solarSystem = new THREE.Object3D();
    this.scene.add(solarSystem);
    this.objects.push(solarSystem);

    /* const arrow = new THREE.ArrowHelper(
      // first argument is the direction
      new THREE.Vector3(2, 2, 0).normalize(),
      // second argument is the orgin
      new THREE.Vector3(0, 0, 35),
      // length
      5,
      // color
      0x10ff00,
       1, // Head lenght
       1); // Head width
    this.scene.add(arrow); */

    //Tierra
    const earthMaterial = new THREE.MeshStandardMaterial({ color: 0x10ff00 });
    this.earthMesh = new THREE.Mesh(sphereGeometry, earthMaterial);
    this.earthMesh.receiveShadow = true;
    this.earthMesh.castShadow = true;
    this.earthMesh.position.set(0, 0,2);
    solarSystem.add(this.earthMesh);
    //this.objects.push(this.earthMesh);

    this.createFloor3D();
    //this.createPanels();
  }

  private resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer): boolean {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  private render(time: number) {
    if (!this.renderer) return;
    if (!this.camera) return;
    if (this.resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }
    this.camControl?.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    if (!this.scene) return;
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render.bind(this));
  }

  private createFloor3D() {
    if(!this.scene) return;
    const w = 50; const h = 30;
    const geometry = new THREE.PlaneGeometry(w, h, 10, 10);
    const x0 = w / 2; const y0 = h / 2;
    const ofx = -25; const ofy = -25;
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xC7C7C7 });
    const terrainMesh = new THREE.Mesh(geometry, groundMaterial);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    terrainMesh.position.z = 0;
    terrainMesh.position.x = x0 + ofx;
    terrainMesh.position.y = y0 + ofy;
    const positions = geometry.attributes['position'] as BufferAttribute;
    console.log(positions.count);
    for (let i = 0; i < positions.count; i++) {
      //vertices[ j + 1 ] = 0;
      const xx = x0 + positions.getX(i) + ofx;
      const yy = y0 + positions.getY(i) + ofy;
      const zz = this.calculateHeight(xx, yy);

      positions.setZ(i, zz);
      //console.log({i, xx, yy, zz});
    }
    geometry.computeVertexNormals(); // needed for helper
    this.scene.add(terrainMesh);
    this.terrainMesh = terrainMesh;
    /* const edges = new THREE.EdgesGeometry( geometry );
    const line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0x1000ff, linewidth:4 } ) );
    this.scene.add( line ); */

  }

  private calculateHeight(x: number, y: number): number {
    return 0;
    /* const dx = x - 150;
    const dy = y - 300;
    let dis = Math.sqrt(dx * dx + dy * dy);
    dis = dis * (Math.PI / 2.0) / 200;
    const h = (Math.sin(dis) ** 2) * 20 + 20;
    return h; */
  }
}
