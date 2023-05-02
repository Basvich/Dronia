import { TDrone3D } from '../Objects/Drone3D';
import * as THREE from 'three';
import * as tf from '@tensorflow/tfjs';

/**
 * Sirve para enlazar tensores de tf y el drone
 */
export default class AdapterDroneTf{  
  /** Simple simplificación segun la accion, la fuerza que le pedimos al dron */
  private forces:number[];
  /**El target de la posición deseada */
  public targetY=10;
  constructor(private drone:TDrone3D){
    this.forces=[drone.FuerzaNeutra*0.50, drone.FuerzaNeutra*0.8, drone.FuerzaNeutra, drone.FuerzaNeutra*1.2, drone.FuerzaNeutra*1.8];
  }

  /**
   * El estado del dron para solo 1D, normalizando sus variables entre [-1,1]
   * @returns Posicion relativa, velocidad
   */
  public getStateTensor(): tf.Tensor2D{
    let posY=THREE.MathUtils.clamp(this.drone.Position.y-this.targetY , -20, 20);
    posY=THREE.MathUtils.mapLinear(posY,-20,20,-1,1);
    let velY=THREE.MathUtils.clamp(this.drone.Velocity.y , -20, 20);
    velY=THREE.MathUtils.mapLinear(velY,-20,20,-1,1);
    return tf.tensor2d([[posY, velY]]);
  }

  /**
   * son las posibilidades de cada accion.
   * 2 niveles de fuerza por direccion + 0 (g)
   * @param data El array con las posibilidades de cada accion
   * @returns 
   */
  public setControlData(data: tf.Tensor2D | undefined){
    if(!data) return;
    const m1=data.argMax();
    m1.print();
    const tensorData = data.dataSync();
    for(let i=0; i< tensorData.length; i++){
      const v=tensorData[i];
      console.log({i,v});
    }
    const mx=data.max();
    console.log(mx);
    let i=0;
    let m=-1000;
    for(let j=0;j<tensorData.length;j++){
      if(tensorData[j]>m){
        i=j;
        m=tensorData[j];
      }
    }
    //tf.topk() Nos devuelve el maximo y el indice tambien
    const fNecesaria=this.forces[i];
    this.drone.TotalForce=fNecesaria;
  }
}