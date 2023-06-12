import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import * as THREE from "three";
import { BufferAttribute } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const framePeriod=0.04;

@Component({
  selector: 'app-three-render',
  templateUrl: './three-render.component.html',
  styleUrls: ['./three-render.component.scss']
})
export class ThreeRenderComponent implements AfterViewInit, OnDestroy {
  private deltaT=0;
  private scene?: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private camera?: THREE.PerspectiveCamera;
  private camControl?: OrbitControls;
  private sunLight?: THREE.DirectionalLight;
  private terrainMesh?: THREE.Mesh;
  private clock = new THREE.Clock();
  //private earthMesh?: THREE.Object3D;
  public dummy={pos:1, vel:2};

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  @ViewChild('canvas') private canvasRef!: ElementRef;

  public CalbackRenderLoop?:(SgElapsed:number)=>void;

  public get Scene(): THREE.Scene | undefined {
    return this.scene;
  }

  ngAfterViewInit(): void {
    this.createScene();
    this.startWebGl(); 
  }

  ngOnDestroy(): void {
    this.disposeCurrentMeshes();
  }

  public startWebGl(): void {
    // Solicita al navegador que programe el repintado de la ventana
    //requestAnimationFrame(this.render.bind(this));
    requestAnimationFrame(()=>this.update());
  }

  public onResized(event: unknown){
    console.log(event);
  }

  private update(){
    if (!this.scene) return;
    requestAnimationFrame(()=>this.update());
    if (!this.renderer) return;
    if (!this.camera) return;
    this.deltaT+=this.clock.getDelta();
    if(this.deltaT>framePeriod){
      this.camControl?.update();
      if(this.CalbackRenderLoop) this.CalbackRenderLoop(this.deltaT);
      this.renderer.render(this.scene, this.camera);
      this.deltaT=this.deltaT-framePeriod;
      if(this.deltaT>framePeriod) this.deltaT=framePeriod;
      if (this.resizeRendererToDisplaySize(this.renderer)) {
        const canvas = this.renderer.domElement;
        this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.updateProjectionMatrix();
      }
    }
  }

  private render(msTime: number) {
    if (!this.renderer) return;
    if (!this.camera) return;
    if (this.resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }
    this.camControl?.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    if (!this.scene) return;
    if(this.CalbackRenderLoop) this.CalbackRenderLoop(msTime);
    this.renderer.render(this.scene, this.camera);
    //requestAnimationFrame(this.render.bind(this));
    requestAnimationFrame((msTime)=>this.render(msTime));
  }

  private resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer): boolean {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      //console.log(`canvas render resize: (${canvas.width}, ${canvas.height}) -> (${canvas.clientWidth}, ${canvas.clientHeight})`);
      renderer.setSize(width, height, false); 
    }
    return needResize;
  }

  private createScene() {
    const fov = 40;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 1000;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    //Posicion inicial de la camara
    this.camera.position.set(2, 12, 12);
    //this.camera.up.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;        //  THREE.PCFSoftShadowMap; //

    this.camControl = new OrbitControls(this.camera, this.renderer.domElement);
    this.camControl.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    this.camControl.dampingFactor = 0.05;
    this.camControl.screenSpacePanning = true;
    this.camControl.minDistance = 1;
    this.camControl.maxDistance = 200;
    this.camControl.enablePan = true;
    this.camControl.keyPanSpeed = 7.0;	// pixels moved per arrow key push

    this.scene = new THREE.Scene();

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(0, 100, 0);
    this.sunLight.position.applyEuler(new THREE.Euler(Math.PI / 4, 0, 0, 'XYZ'));

    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 512;
    this.sunLight.shadow.mapSize.height = 512;
    const d = 100;
    this.sunLight.shadow.camera = new THREE.OrthographicCamera(-d, d, d, -d, 1, 200);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    //this.sunLight.shadow.bias = -0.0005;

    this.sunLight.shadow.camera = new THREE.OrthographicCamera(-d, d, d, -d, 1, 200);
    this.sunLight.name = "sunLight";
    this.scene.add(this.sunLight);


    const light = new THREE.AmbientLight(0xFFFFFF, 0.2);
    this.scene.add(light);

    //const radius = 1;
    //const widthSegments = 6;
    //const heightSegments = 6;
    //const sphereGeometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    //const earthMaterial = new THREE.MeshStandardMaterial({ color: 0x10ff00 });
    /* this.earthMesh = new THREE.Mesh(sphereGeometry, earthMaterial);
    this.earthMesh.receiveShadow = true;
    this.earthMesh.castShadow = true;
    this.earthMesh.position.set(0, 1.2, 0);
    this.scene.add(this.earthMesh);
 */
    //this.createFloor3D();
    this.createPlaneGeo();
    //this.createBox();

    //Create a helper for the shadow camera (optional)
    const helper = new THREE.CameraHelper(this.sunLight.shadow.camera);
    this.scene.add(helper);
    //X: red, Y: Green, Z:Blue
    const axesHelper = new THREE.AxesHelper( 5 );
    this.scene.add( axesHelper );
  }

  private createFloor3D() {
    if (!this.scene) return;
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

  private createBox() {
    const lpanelMaterial = new THREE.MeshLambertMaterial({ color: 0x2233FF });
    const panelGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.5);
    const panelMesh = new THREE.Mesh(panelGeometry, lpanelMaterial);
    panelMesh.receiveShadow = true;
    panelMesh.castShadow = true;
    panelMesh.position.x = 1;
    panelMesh.position.y = 1;
    panelMesh.position.z = 1;
    panelMesh.rotation.x = 0.20;
    panelMesh.rotation.y = 0.10;
    this.scene?.add(panelMesh);
  }

  private createPlaneGeo() {
    if (!this.scene) return;
    const planeSize = 40;

    const loader = new THREE.TextureLoader();
    const texture = loader.load('assets/checker.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);
    //e then make a plane geometry, a material for the plane, and a mesh to insert it in the scene. Planes default to being in the XY plane but the ground is in the XZ plane so we rotate it.
    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.receiveShadow = true;
    mesh.rotation.x = Math.PI * 0.5;
    this.scene.add(mesh);
  }

  private calculateHeight(x: number, z: number): number {
    return 0;
    /* const dx = x - 150;
    const dy = y - 300;
    let dis = Math.sqrt(dx * dx + dy * dy);
    dis = dis * (Math.PI / 2.0) / 200;
    const h = (Math.sin(dis) ** 2) * 20 + 20;
    return h; */
  }

  /**Elimina los elementos actuales que existen en la scena      
  * @private
  * @memberof ThreeTestComponent
  */
  private disposeCurrentMeshes(): void {
    if (this.terrainMesh) this.scene?.remove(this.terrainMesh);
    this.terrainMesh?.geometry.dispose();
    this.terrainMesh = undefined;
  }
}
