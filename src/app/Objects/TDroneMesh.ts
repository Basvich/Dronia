import * as THREE from "three";
import { TDrone3D, TTargetDrone } from "./Drone3D";

const lpanelMaterial=new THREE.MeshLambertMaterial({color: 0x2233FF});


/**
 * Simplemente el wrapper con la información para el pintado 3D. Para actualizar sus posición, tira de TDrone3D
 */
export class TDroneMesh {
  private arrow!: THREE.ArrowHelper;
  private droneMesh!: THREE.Mesh;

  public get Mesh():THREE.Mesh {return this.droneMesh;}
  public get Arrow(){return this.arrow;}

  public constructor(public Drone: TDrone3D) {
    this.createMesh();
    //this.droneMesh.rotation
  }

  /**
   * Actualiza su informacion del objeto (dron) relacionado
   */
  public updateFromDrone(){
    this.droneMesh.position.copy(this.Drone.Position);
    this.droneMesh.rotation.copy(this.Drone.Rotation);
  }

  public Delete(scene: THREE.Scene):void{
    while (this.droneMesh.children.length){
      this.droneMesh.remove(this.droneMesh.children[0]);
    }
    scene.remove(this.droneMesh);
  }

  private createMesh() {
    //El cuerpo, una simple caja    
    const droneMesh = new THREE.Mesh();
    droneMesh.castShadow = true;
    droneMesh.position.copy(this.Drone.Position);
    const body = TDroneMesh.createBody(this.Drone);
    droneMesh.add(body);
    const helixGeom = new THREE.CylinderGeometry(0.3, 0.4, 0.1);
    const helixMaterial = new THREE.MeshBasicMaterial({ color: 0x800000 });
    const helixMaterial2 = new THREE.MeshBasicMaterial({ color: 0x008000 });
    const flHelix = new THREE.Mesh(helixGeom, helixMaterial2);  //Front left
    flHelix.position.x = this.Drone.Dimentions.helSepLong;
    flHelix.position.z = -this.Drone.Dimentions.helSepWith;
    flHelix.castShadow = true;
    droneMesh.add(flHelix);
    const frHelix = new THREE.Mesh(helixGeom, helixMaterial);  //Front Right
    frHelix.position.x = this.Drone.Dimentions.helSepLong;
    frHelix.position.z = this.Drone.Dimentions.helSepWith;
    frHelix.castShadow = true;
    droneMesh.add(frHelix);
    const blHelix = new THREE.Mesh(helixGeom, helixMaterial);  //Front Right
    blHelix.position.x = -this.Drone.Dimentions.helSepLong;
    blHelix.position.z = -this.Drone.Dimentions.helSepWith;
    blHelix.castShadow = true;
    droneMesh.add(blHelix);
    const brHelix = new THREE.Mesh(helixGeom, helixMaterial);  //Front Right
    brHelix.position.x = -this.Drone.Dimentions.helSepLong;
    brHelix.position.z = this.Drone.Dimentions.helSepWith;
    brHelix.castShadow = true;
    droneMesh.add(brHelix);
    //droneMesh.castShadow=true;
    //droneMesh.receiveShadow = true;
    droneMesh.rotation.order = "XYZ";
    this.droneMesh = droneMesh;
    this.arrow = new THREE.ArrowHelper(
      // first argument is the direction
      new THREE.Vector3(0, 1, 0).normalize(),
      // second argument is the orgin
      new THREE.Vector3(0, 0, 0),
      // length
      2,
      // color
      0x10ff00, 0.4, 0.3);
  }

  private static createBody(drone: TDrone3D): THREE.Mesh {
    const bxDims=drone.Dimentions.body;
    const bodyGeometry = new THREE.BoxGeometry(bxDims[0],bxDims[1], bxDims[2]);
    const body = new THREE.Mesh(bodyGeometry, lpanelMaterial);
    /*  for (let i = 0; i < bodyGeometry.faces.length; i += 2) {
       var faceColor = Math.random() * 0xffffff;
       geometry.faces[i].color.setHex(faceColor);
       geometry.faces[i + 1].color.setHex(faceColor);
     } */
    body.castShadow = true;
    return body;
  }
}


/**
 * Simple wrapper para el pintado 3D del target
 */
export class TTargetMesh{
  private wireframe!: THREE.LineSegments<THREE.EdgesGeometry<THREE.BoxGeometry>, THREE.LineBasicMaterial>;

  public get VisualObj(){ return this.wireframe;}  

  public constructor(public target: TTargetDrone) {
    this.createMesh();
  }

  public updateFromController(){
    this.wireframe.position.setY(this.target.y);
  }

  private createMesh() {
    const boxGeometry = new THREE.BoxGeometry(1,0.4, 1);
    const geo = new THREE.EdgesGeometry( boxGeometry ); // or WireframeGeometry( geometry )
    const mat = new THREE.LineBasicMaterial( { color: 0x34ebe1, linewidth: 2 } );
    this.wireframe = new THREE.LineSegments( geo, mat );
    this.wireframe.position.y=this.target.y;    
  }

}
