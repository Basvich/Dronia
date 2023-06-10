import { TDrone3D } from '../Objects/Drone3D';
import * as THREE from 'three';
import * as tf from '@tensorflow/tfjs';

/**Información util para evitar recalculos en el los  */
export interface InfoAction {
  /**Indice de la accion que se tuvo en cuenta */
  indexActionY: number;
}

/**
 * Sirve para enlazar tensores de tf y el drone
 */
export default class AdapterDroneTf {
  /** Simple simplificación segun la accion, la fuerza que le pedimos al dron. Creciente en potencia */
  private forces: number[];
  /**El target de la posición deseada */
  public targetY = 6;
  public get Forces(): number[] { return this.forces; }

  constructor(private drone: TDrone3D) {
    this.forces = [drone.FuerzaNeutra * 0.00, drone.FuerzaNeutra * 0.5, drone.FuerzaNeutra, drone.FuerzaNeutra * 1.5, drone.FuerzaNeutra * 2];
  }

  /**
   * El estado del dron para solo 1D, normalizando sus variables entre [-1,1]
   * @returns Posicion relativa, velocidad
   */
  public getStateTensor(): tf.Tensor2D {
    const posY = this.normalizePosY(this.drone.Position.y);
    const velY = this.normalizeVely(this.drone.Velocity.y);    
    return tf.tensor2d([[posY, velY]]);
  }

  /**
   * Toma la predicción obtenida de la red, y la traduce en el control al dron
   * 
   * @param data El array con las posibilidades de cada accion
   * @returns Información sobre la acción ejecutada
   */
  public setControlData(data: tf.Tensor2D | undefined, forcedI?: number): InfoAction | undefined {
    if (!data) return;
    //const m1=data.argMax();
    //m1.data();
    //m1.print();
    //m1.dispose();
    const tensorData = data.dataSync();
    /* for(let i=0; i< tensorData.length; i++){
      const v=tensorData[i];
      console.log({i,v});
    } */
    //const mx=data.max();
    //console.log(mx);
    let i = 0;
    if (forcedI === undefined) {
      let m = -1000;
      for (let j = 0; j < tensorData.length; j++) {
        if (tensorData[j] > m) {
          i = j;
          m = tensorData[j];
        }
      }
    } else {
      i = forcedI;
    }
    //tf.topk() Nos devuelve el maximo y el indice tambien
    const fNecesaria = this.forces[i];
    this.drone.TotalForce = fNecesaria;
    //console.log(`Drone Action: ${i} -> TotalForce:${(fNecesaria / this.drone.FuerzaNeutra).toFixed(2)}`);
    return { indexActionY: i };
  }

  public TotalRelativeForce(index: number): number {
    return this.forces[index] / this.drone.FuerzaNeutra;
  }

  /**
   * 
   * @param dataXY array de [Y, velY]
   * @returns un tensor ajustado según el propio adaptador
   */
  public getMappedTensor(dataXY: number[][]): tf.Tensor2D {
    //if (dataXY.length !== 2) throw new Error('Tiene que tener un array X y otro Y de identicas dimensiones');
    
    //Devuelve un array con vectores[y, vely]
    const arrXY = dataXY.map((value) => {
      const posY=this.normalizePosY(value[0]);
      const velY=this.normalizeVely(value[1]);
      return [posY, velY];
    });
    return tf.tensor2d(arrXY);

    /* //Devuelve un array con vectores [y], [vely]
    const arrPosyY=dataXY.map((value) => {
      let posY = THREE.MathUtils.clamp(value[0] - this.targetY, -20, 20);
      posY = THREE.MathUtils.mapLinear(posY, -20, 20, -1, 1);
      return posY;
    });
    const arrVelY=dataXY.map((value) => {
      let velY = THREE.MathUtils.clamp(value[1], -10, 10);
      velY = THREE.MathUtils.mapLinear(velY, -10, 10, -1, 1);
      return velY;
    }); 
    return tf.tensor2d([arrPosyY, arrVelY]);*/
  }

  public normalizePosY(posY:number):number{
    const r = THREE.MathUtils.clamp(posY - this.targetY, -20, 20);
    //r = THREE.MathUtils.mapLinear(posY, -20, 20, -1, 1);
    return r;
  }

  // eslint-disable-next-line class-methods-use-this
  public normalizeVely(vely:number):number{
    const r = THREE.MathUtils.clamp(vely, -4, 4);
    //r = THREE.MathUtils.mapLinear(r, -3, 3, -1, 1);
    return r;
  }
}