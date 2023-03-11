import * as THREE from "three";
import { TSpatialVector } from "./calcObjects";



/** Separacion lateral sobre eje z de la helice con el centro */
const helSepWith=0.5;
/** Separacion longitudinal sobre eje X con el centro gravedad))*/
const helSepLong=0.6;
const masa=1;

const g=9.81;
/** Fuerza maxima (cada rotor sería 1/4) */
const maxTotalForce=2*masa*g;
const maxRotorForce=maxTotalForce*0.25;
const ladoX=0.9, ladoY=0.2, ladoZ=0.5;
const bodyGeometry = new THREE.BoxGeometry(ladoX,ladoY, ladoZ);
const lpanelMaterial=new THREE.MeshLambertMaterial({color: 0x2233FF});  


export class TDrone3D{
 
  private arrow! : THREE.ArrowHelper;
  private droneMesh!:THREE.Mesh;
  private propelers:TSpatialVector[]=[];
  /** Vector fijo debido a la gravedad */
  private mG=new THREE.Vector3(0,-masa*g,0);
  /**Momento de inercia en cada uno de los ejes fijo calculado */
  private momentoInercia: THREE.Vector3;
  /* Fuerzas de los rotores en un momento cualquiera LF,RF,LB,RF */
  private propelersForce: number[]=[];
  /* Vector que apunta en cada momento en la direccion de los rotores */
  private rotorDir=new THREE.Vector3(0,1,0);
  /** Resultado de la fuerza de los motores y gravedad */
  private resultAccel=new THREE.Vector3(0,1,0);
  /** Resultado de la fuerza angular */
  private resultTorque=new THREE.Vector3(0,1,0);
  /** Velocidad linean del CG del drone */
  private velocity=new THREE.Vector3(0,0,0);
  /** Velocidad angular en torno a los ejes del drone */
  private wBody=new THREE.Vector3(0,0,0);
  private rotorDir0=this.rotorDir.clone();
  /** Fuerza total aplicada por todas las helices */
  private totalForce:number=masa*g;
  /** 
   * Balance longitudinal a lo largo de X, girando con Z (Pitch) 
   * entre -1 y 1, 0 es equilibrado
   * con valor -1, el par trasero tiene 0 fuerza, y el delantero el doble
   * con valor 1 el par trasero tiene el doble, y el delantero 0
   * */
  private pithBalance=0;

  /** Rotacion en torno a cada eje */
  private rot=[0,0,0];
  /** angulos euler en xyz Roll, Yaw, Pitch */
  private orientationEuler=new THREE.Vector3(0,0,0);
  /** Velocidades angulares en torno a cada eje */
  private angVel=[0,0,0];

   /**simples vectores precreados para evitar crearlos continuamente en el mainloop */
   private bvelocity=new THREE.Vector3(0,0,0);
  private frontForce=1;
  private backForce=1;

  public get RotationX(): number {return this.droneMesh.rotation.x}
  public set RotationX(v: number) {
    this.droneMesh.rotation.x=v;
    this.rotateArrow();
  }
  public get RotationY(): number {return this.droneMesh.rotation.y}
  public set RotationY(v: number) {
    this.droneMesh.rotation.y=v;
    this.rotateArrow();
  }
  public get RotationZ(): number {return this.droneMesh.rotation.z}
  public set RotationZ(v: number) {
    this.droneMesh.rotation.z=v;
    this.rotateArrow();
  }

  public get TotalForce():number{return this.totalForce}
  public set TotalForce(v: number){this.totalForce=THREE.MathUtils.clamp(v,0,maxTotalForce)}
  public get PithBalance():number{return this.pithBalance}
  public set PithBalance(v: number){this.pithBalance=THREE.MathUtils.clamp(v,-1,1)}

  public get Mesh():THREE.Mesh {return this.droneMesh;}
  public get Arrow(){return this.arrow;}

  public constructor(public x: number, public y: number, public z:number=0){
    this.createMesh();
    this.momentoInercia=this.calcMomentoInercia(ladoX,ladoY,ladoZ,masa);
    this.initializeInitialForce();
  }

  /**
   * 
   * @param elapsedSg Segundos que pasaron entre el momento anterior y este
   */
  public Simulate(elapsedSg:number){
    this.commandRotors();
    this.calcPhysic();
    this.calcMovment(elapsedSg);
  }

  public Delete(scene: THREE.Scene):void{
    while (this.droneMesh.children.length){
      this.droneMesh.remove(this.droneMesh.children[0]);
    }
    scene.remove(this.droneMesh);
  }

  private createMesh(){
    //El cuerpo, una simple caja
    
    const droneMesh=new THREE.Mesh();
    droneMesh.castShadow=true;
    droneMesh.position.x = this.x;
    droneMesh.position.y = this.y;
    droneMesh.position.z=this.z;
    const body=this.createBody();
    droneMesh.add(body);
    const helixGeom=new THREE.CylinderGeometry( 0.3, 0.4, 0.1);
    const helixMaterial = new THREE.MeshBasicMaterial( {color: 0x800000} );
    const helixMaterial2 = new THREE.MeshBasicMaterial( {color: 0x008000} );
    const flHelix=new THREE.Mesh(helixGeom,helixMaterial2);  //Front left
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
    droneMesh.rotation.order="XYZ"    
    this.droneMesh=droneMesh;
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

  private createBody():THREE.Mesh{
    const body=new THREE.Mesh(bodyGeometry, lpanelMaterial);
   /*  for (let i = 0; i < bodyGeometry.faces.length; i += 2) {
      var faceColor = Math.random() * 0xffffff;
      geometry.faces[i].color.setHex(faceColor);
      geometry.faces[i + 1].color.setHex(faceColor);
    } */
    body.castShadow=true;
    return body;
  }

  private initializeInitialForce(){
    const peso=g*masa;
    this.frontForce=peso/2;
    this.backForce=peso/2;
    const initialForce=new THREE.Vector3(0,this.frontForce/2,0);
    const pos=new THREE.Vector3(helSepLong,0,-helSepWith);
    this.propelers.push(new TSpatialVector( pos, initialForce)); //Front left
    this.propelersForce.push(this.frontForce/2);
    pos.setZ(helSepWith);
    this.propelers.push(new TSpatialVector( pos, initialForce)); //Front right
    this.propelersForce.push(this.frontForce/2);
    pos.setX(-helSepLong); pos.setZ(-helSepWith);
    initialForce.setY(this.backForce/2)
    this.propelers.push(new TSpatialVector( pos, initialForce)); //Back left
    this.propelersForce.push(this.backForce/2);
    pos.setZ(helSepWith);
    this.propelers.push(new TSpatialVector( pos, initialForce)); //Back right
    this.propelersForce.push(this.backForce/2); 
  }

  /** Aplica los valores de control sobre a fuerza de los rotores */
  private commandRotors(){
    const forceRotor=this.totalForce*0.25;
    //Front Left
    this.propelersForce[0]=forceRotor+this.PithBalance*forceRotor;
    //Front Right
    this.propelersForce[1]=forceRotor+this.PithBalance*forceRotor;
    //Back left
    this.propelersForce[2]=forceRotor-this.PithBalance*forceRotor;
    //back Right
    this.propelersForce[3]=forceRotor-this.PithBalance*forceRotor;
  }

  private calcPhysic(){
    //this.droneMesh.setRotationFromEuler()    
    const pitchNode = new THREE.Object3D( );    
    this.calcRotorForces();
    this.calcMomentForce();
  }

  /** Calculo de la fuerza neta sobre el CG */
  private calcRotorForces(){
    //Para fuerza neta 3d, sumamos todas las fuerzas
    const modulo=this.propelersForce[0]+this.propelersForce[1]+this.propelersForce[2]+this.propelersForce[3];
    this.resultAccel.copy(this.rotorDir);
    this.resultAccel.multiplyScalar(modulo);
    this.resultAccel.add(this.mG);
    this.resultAccel.divideScalar(masa);
  }
  /** Calculo del torque */
  private calcMomentForce(){
    const tx=(this.propelersForce[0]-this.propelersForce[1]+this.propelersForce[2]-this.propelersForce[3])*helSepWith;
    const tz=(-this.propelersForce[0]-this.propelersForce[1]+this.propelersForce[2]+this.propelersForce[3])*helSepLong; 
    const ax=tx/this.momentoInercia.x;
    const az=tz/this.momentoInercia.z;
    this.resultTorque.set(ax,0,az);
  }

  private calcMovment(segs:number){
    this.resultAccel.multiplyScalar(segs);
    this.resultTorque.multiplyScalar(segs);
    //Sumamos a los valores actuales
    this.velocity.add(this.resultAccel);
    this.wBody.add(this.resultTorque);
    //Finalmente se actualiza la posición y el angulo de giro    
    this.droneMesh.position.addScaledVector(this.bvelocity,segs);
    this.orientationEuler.addScaledVector(this.wBody,segs);
    this.droneMesh.rotation.setFromVector3(this.orientationEuler);    
  }

  private rotateArrow(){
    this.arrow.setRotationFromEuler(this.droneMesh.rotation);
  }

  /**
   * Calcula el momento de inercia en cada uno de los ejes
   * @param ladoX lado del paralelepipedo en el eje X
   * @param ladoY lado del paralelepipedo en el eje Y
   * @param ladoZ lado del paralelepipedo en el eje Z
   * @param m masa
   * @returns momento de inercia en X, Y, Z
   */
  private calcMomentoInercia(ladoX:number, ladoY:number, ladoZ:number, m:number):THREE.Vector3{
    const c1=1/12*m;
    const ix=c1*(ladoY*ladoY+ladoZ*ladoZ);
    const iy=c1*(ladoX*ladoX+ladoZ*ladoZ);
    const iz=c1*(ladoY*ladoY+ladoX*ladoX);
    return new THREE.Vector3(ix,iy,iz);
  } 
}
