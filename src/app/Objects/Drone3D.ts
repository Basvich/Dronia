import * as THREE from "three";


const bodyGeometry = new THREE.BoxGeometry(0.90, 0.2, 0.50);
const lpanelMaterial=new THREE.MeshLambertMaterial({color: 0x2233FF});  
/** Separacion lateral de la helice con el centro */
const helSepWith=0.5;
/** Separacion longitudinal con el centro */
const helSepLong=0.6;


export class TDrone3D{
  private DroneMesh!:THREE.Mesh;

  public get Mesh():THREE.Mesh {return this.DroneMesh;}

  public constructor(public x: number, public y: number, public z:number=0){
    this.createMesh();
  }

  public Delete(scene: THREE.Scene):void{
    while (this.DroneMesh.children.length){
      this.DroneMesh.remove(this.DroneMesh.children[0]);
    }
    scene.remove(this.DroneMesh);
  }

  private createMesh(){
    //El cuerpo, una simple caja
    const body=new THREE.Mesh(bodyGeometry, lpanelMaterial);
    body.castShadow=true;
    const droneMesh=new THREE.Mesh();
    droneMesh.castShadow=true;
    droneMesh.position.x = this.x;
    droneMesh.position.y = this.y;
    droneMesh.position.z=this.z;
    droneMesh.add(body);
    const helixGeom=new THREE.CylinderGeometry( 0.3, 0.4, 0.1);
    const helixMaterial = new THREE.MeshBasicMaterial( {color: 0x800000} );
    const flHelix=new THREE.Mesh(helixGeom,helixMaterial);  //Front left
    flHelix.position.x=helSepLong;
    flHelix.position.z=-helSepWith;
    flHelix.castShadow=true;
    droneMesh.add(flHelix);
    const frHelix=new THREE.Mesh(helixGeom,helixMaterial);  //Front Right
    frHelix.position.x=helSepLong;
    frHelix.position.z=helSepWith;
    frHelix.castShadow=true;
    droneMesh.add(frHelix);
    const blHelix=new THREE.Mesh(helixGeom,helixMaterial);  //Front Right
    blHelix.position.x=-helSepLong;
    blHelix.position.z=-helSepWith;
    blHelix.castShadow=true;
    droneMesh.add(blHelix);
    const brHelix=new THREE.Mesh(helixGeom,helixMaterial);  //Front Right
    brHelix.position.x=-helSepLong;
    brHelix.position.z=helSepWith;
    brHelix.castShadow=true;
    droneMesh.add(brHelix);
    //droneMesh.castShadow=true;
    //droneMesh.receiveShadow = true;
    this.DroneMesh=droneMesh;

  }
}
