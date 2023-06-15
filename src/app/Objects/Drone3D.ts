import * as THREE from "three";
import { TSpatialVector } from "./calcObjects";



interface IDroneDimes{
  /** Separacion lateral sobre eje z de la helice con el centro (en m) */
  helSepWith:number;
  /** Separacion longitudinal sobre eje X con el centro gravedad))*/
  helSepLong:number;
  /** Dimensiones del cuerpo [x,y,z], donde z es hacia arriba */
  body:[number, number, number]
}
/** VAlor de la constante g (gravitation) */
const g=9; 
const cx=0.5; //Simple simplificacion de la resistencia aerodinamica devido a la velocidad. Esto multiplica el cuadrado de la velocidad

const maxVelRotorForce=28; //En ms/s (~100Km/h) la velocidad en direccion del rotor a partir de la cual ya no genera ninguna fuerza


const helSepWith=0.5; 
const helSepLong=0.6;

const masa=1;  //en Kg 
const pesoFuerza=masa*g;  //En N la fuerza
const invPesoFuerza=1/pesoFuerza;
/** Velocidad maxima angular en torno a x en la que el rotor ya no genera torque adiciona (el 0.1 es totalmente arbitrario para simplificar otros efectos)*/
const maxAngXVelRotorForce=maxVelRotorForce/helSepWith*0.5;
const maxAngZVelRotorForce=maxVelRotorForce/helSepLong*0.5;


/** Fuerza maxima (cada rotor sería 1/4) */
const maxTotalForce=2*pesoFuerza;
const maxRotorForce=pesoFuerza*0.25;
/** Medidas del cuerpo del drone */
const ladoX=0.8, ladoY=0.2, ladoZ=0.4;

  

 /**
  * Simula fisicamente un Dron y las fuerzas aplicadas sobre el.
  * En los cálculos, se evita en lo posible creacion de nuevas clases, con lo que se usan ya vectores creados en vez de recrearlos con cada calculo
  * No sabe nada de renderizado
  */
export class TDrone3D{
  private simStep=0;
  private lastRot=0;
  private lapseAcum=0;
  //private arrow! : THREE.ArrowHelper;
  //private droneMesh!:THREE.Mesh;
  private totalMasa=masa;
  private invPesoFuerza=1/(this.totalMasa*g);

  /** Vector fijo debido a la gravedad */
  private mG=new THREE.Vector3(0,-pesoFuerza,0);
  /** Una posible carga añadida al peso del dron */
  private _payload=0;
  /**Momento de inercia en cada uno de los ejes fijo calculado */
  private momentoInercia: THREE.Vector3;
  /* Fuerzas de los rotores en un momento cualquiera LF,RF,LB,RF */
  private propelersForce: number[]=[];
  /**
   * Resultante de las fuerzas de los rotores (parte lineal, sin torque)
   */
  private centralPropelerForce=new THREE.Vector3(0,0,0);
  /**
   * fuerza de resistencia debido al aire
   */
  private dragForce=new THREE.Vector3(0,0,0);
  /* Vector que apunta en cada momento en la direccion de los rotores */
  private rotorDir=new THREE.Vector3(0,1,0);
  /** 
   * Resultado de las fuerzas aplicadas
   * */
  private resultForces=new THREE.Vector3(0,0,0);
  /**
   * Fuerza total normalizada (g=1)
   */
  private resultNormalizedForces=new THREE.Vector3(0,0,0);
  private resultAccel=new THREE.Vector3(0,1,0);
  
  /** Resultado de la fuerza angular */
  private resultTorque=new THREE.Vector3(0,1,0);
  /** Velocidad linean del CG del drone */
  private velocity=new THREE.Vector3(0,0,0);
  /** Velocidad angular en torno a los ejes del drone */
  private wBody=new THREE.Vector3(0,0,0);  
  /** Fuerza total aplicada por todas las helices (Newtons) */
  private totalForce:number=pesoFuerza;
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
  private frontForce=1;
  private backForce=1;

  public Dimentions:IDroneDimes={helSepWith, helSepLong, body:[ladoX, ladoY, ladoZ]};

  public readonly FuerzaNeutra=pesoFuerza;

  //public get Position(){return this.droneMesh.position;}
  public Position=new THREE.Vector3(0,0,0);
  public Rotation=new THREE.Euler(0,0,0);

  public get Velocity(){return this.velocity;}
  /**Fuerza neta normalizada que notaría un sensor en el dron */
  public get NetForce(){return this.resultNormalizedForces;}
  public set Payload(value:number){
     value=THREE.MathUtils.clamp(value,0,1); 
     this._payload=value;
     this.totalMasa=masa+(value*masa);
     this.invPesoFuerza=1/(this.totalMasa*g);
     this.mG.set(0,-(this.totalMasa*g),0);
  }

  public get RotationX(): number {return this.Rotation.x;}
  public set RotationX(v: number) {this.Rotation.x=v; }
  public get RotationY(): number {return this.Rotation.y;}
  public set RotationY(v: number) { this.Rotation.y=v; }
  public get RotationZ(): number {return this.Rotation.z;}
  public set RotationZ(v: number) { this.Rotation.z=v;}
  public set Pitch(v:number) {this.orientationEuler.z=v;}

  public get TotalForce():number{return this.totalForce;}
  public set TotalForce(v: number){this.totalForce=THREE.MathUtils.clamp(v,0,maxTotalForce);}
  public get PithBalance():number{return this.pithBalance;}
  public set PithBalance(v: number){this.pithBalance=THREE.MathUtils.clamp(v,-1,1);}

  //
  //public 

  public constructor(public x: number, public y: number, public z:number=0){    
    this.Position.set(x,y,z);
    this.momentoInercia=this.calcMomentoInercia(this.Dimentions.body[0], this.Dimentions.body[1], this.Dimentions.body[2], masa);
    this.initializeInitialForce();
  }

  /**
   * 
   * @param elapsedSg Segundos que pasaron entre el momento anterior y este
   */
  public Simulate(elapsedSg:number){
    this.lapseAcum+=elapsedSg;
    if(this.simStep % 128===0){
      const vr=(this.orientationEuler.z-this.lastRot)/this.lapseAcum;
      //console.log(`-- Rot medida: ${vr.toFixed(2)} rad/s --`);
      this.lapseAcum=0;
      this.lastRot=this.orientationEuler.z;
    }
    this.commandRotors();
    this.calcPhysic();
    this.calcMovment(elapsedSg);
    this.simStep++;
  }

  public Reset(){
    this.orientationEuler.set(0,0,0);
    this.Rotation.set(0,0,0);
    this.wBody.set(0,0,0);
    this.velocity.set(0,0,0);
    this.Position.set(0,4,0);
    this.pithBalance=0;
    this.totalForce=pesoFuerza;
  }

  /** Envia al log información básica de la posición y velocidad */
  public Print(){
    console.log(`pos:[${this.Position.y}] vel:[${this.velocity.y}]`);
  }
 

  private initializeInitialForce(){
    const peso=g*this.totalMasa;
    this.frontForce=peso/2;
    this.backForce=peso/2;
    const initialForce=new THREE.Vector3(0,this.frontForce/2,0);
    const pos=new THREE.Vector3(helSepLong,0,-helSepWith);    
    this.propelersForce.push(this.frontForce/2);
    pos.setZ(helSepWith);
    this.propelersForce.push(this.frontForce/2);
    pos.setX(-helSepLong); pos.setZ(-helSepWith);
    initialForce.setY(this.backForce/2);
    this.propelersForce.push(this.backForce/2);
    pos.setZ(helSepWith);
    this.propelersForce.push(this.backForce/2); 
  }

  /** Aplica los valores de control sobre a fuerza de los rotores */
  private commandRotors(){
    const forceRotor=this.totalForce*0.25;
    //Front Left
    this.propelersForce[0]=forceRotor+this.pithBalance*forceRotor;
    //Front Right
    this.propelersForce[1]=forceRotor+this.pithBalance*forceRotor;
    //Back left
    this.propelersForce[2]=forceRotor-this.pithBalance*forceRotor;
    //back Right
    this.propelersForce[3]=forceRotor-this.pithBalance*forceRotor;
  }

  private calcPhysic(){   
    this.calcTotalForces();
    this.calcMomentForce();
  }

  /** Sumamos todas las fuerzas que se aplican */
  private calcTotalForces(){
    this.calcRotorForces();
    this.calcDragForce();
    this.resultForces.copy(this.centralPropelerForce);    
    this.resultForces.add(this.dragForce);
    this.resultNormalizedForces.copy(this.resultForces);
    this.resultNormalizedForces.multiplyScalar(-this.invPesoFuerza);
    this.resultForces.add(this.mG);
  }

  /** Calculo de la fuerza neta sobre el CG */
  private calcRotorForces(){  
    //Para fuerza neta 3d, sumamos todas las fuerzas
    const modulo=this.propelersForce[0]+this.propelersForce[1]+this.propelersForce[2]+this.propelersForce[3];
    this.resultAccel.copy(this.rotorDir);
    this.centralPropelerForce.copy(this.rotorDir);
    this.resultAccel.multiplyScalar(modulo);
    this.centralPropelerForce.multiplyScalar(modulo);
    //Se rota lo mismo que el modulo
    this.resultAccel.applyEuler(this.Rotation);
    this.centralPropelerForce.applyEuler(this.Rotation);
    

    this.resultAccel.add(this.mG);
    this.resultAccel.divideScalar(this.totalMasa); 
    if(this.simStep % 128===0){      
      //console.log(`calcRotorForces() resultAc:${TDrone3D.ToString(this.resultAccel)}`);
    }
  }

  private calcDragForce(){
    this.dragForce.copy(this.velocity);
    TDrone3D.squaredSign(this.dragForce); 
    this.dragForce.multiplyScalar(cx);
    this.dragForce.negate();
  }

  /** Calculo del torque */
  private calcMomentForce(){ 
    if(this.pithBalance>=0.3){
      //console.log('eoo');
    }
    //En Y los rotores no producen totque, ya que son paralelos
    let tx=(this.propelersForce[0]-this.propelersForce[1]+this.propelersForce[2]-this.propelersForce[3])*helSepWith;    
    let tz=(-this.propelersForce[0]-this.propelersForce[1]+this.propelersForce[2]+this.propelersForce[3])*helSepLong; 
    //Escalamos la propia fuerza calculada para limitarla al maximo que puede generar un rotor por su propio movimiento
    let absW=Math.abs(this.wBody.x);
    if(absW<maxAngXVelRotorForce){
      tx=(1-absW/maxAngXVelRotorForce)*tx;  //Se disminuye en proporcion la fuerza
    } else tx=0;
    absW=Math.abs(this.wBody.z);
    if(absW<maxAngZVelRotorForce){
      const factor=(1-absW/maxAngZVelRotorForce);
      tz=factor*tz;  //Se disminuye en proporcion la fuerza
      if(this.simStep % 128===0){
        //console.log(`calcMomentForce() maxAngZVelRotorForce: ${maxAngZVelRotorForce.toFixed(2)} absW:${absW.toFixed(2)}  factor:${factor.toFixed(2)}`);
      }
    } else tz=0;
    //Se aplica la fuerza para obtener la aceleracion
    const ax=tx/this.momentoInercia.x;
    const az=tz/this.momentoInercia.z;  //En rad/s
    this.resultTorque.set(ax,0,az);
    if(this.simStep % 128===0){
      //console.log(`calcMomentForce() tz:${tz.toFixed(2)}  az:${az.toFixed(2)} wz:${this.wBody.z.toFixed(2)}`);
    }
  }

  /**
   * Con las fuerzas, se calcula el movimiento y posicion
   * @param segs 
   */
  private calcMovment(segs:number){   
    this.resultAccel.copy(this.resultForces); 
    this.resultAccel.divideScalar(this.totalMasa);   
        
    //Sumamos a los valores actuales
    this.velocity.addScaledVector(this.resultAccel,segs);
    this.wBody.addScaledVector(this.resultTorque,segs);
    
     let f=0.04;
    if(segs<1) f=0.95; 
    this.wBody.multiplyScalar(f);  //<----- OJO, mejorar eso, es una cutrez para simular la conservacion de momento por los rotores
    
    //this.wBody.addScaledVector(this.rotationalResistence, segs);
    if(this.simStep % 128===0){
      /* const vdifRot=this.rotationalResistence.z*segs;
      console.log(`calcMovment() wBody.z:${this.wBody.z.toFixed(2)} rad/s  rot resistence: ${this.rotationalResistence.z.toFixed(2)} Wdif=${vdifRot.toFixed(2)}  segs:${segs}}`);
      console.log(`calcMovment() resultAc:${TDrone3D.ToString(this.resultAccel)} linealResistence.y:${this.linealResistence.y.toFixed(2)}`); */
    }  

    //Finalmente se actualiza la posición y el angulo de giro    
    this.Position.addScaledVector(this.velocity,segs);
    this.orientationEuler.addScaledVector(this.wBody, segs);
    this.Rotation.setFromVector3(this.orientationEuler);       
  }

 /*  private rotateArrow(){
    this.arrow.setRotationFromEuler(this.droneMesh.rotation);
  } */

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
  
  /** El cuadrado de cada componente del vector,pero manteniendo el signo original */
  private static squaredSign(v:THREE.Vector3){
    v.x=Math.abs(v.x)*v.x;
    v.y=Math.abs(v.y)*v.y;
    v.z=Math.abs(v.z)*v.z;
  }

  private static ToString(v:THREE.Vector3){
    return `[${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}]`;
  }
}

/**
 * Simple controlador para el target del dron
 */
export class TTargetDrone{
  constructor(public y:number){}
}