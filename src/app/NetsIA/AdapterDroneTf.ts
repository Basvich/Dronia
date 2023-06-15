import { TDrone3D } from '../Objects/Drone3D';
import * as THREE from 'three';
import * as tf from '@tensorflow/tfjs';

/**Información util para evitar recalculos en el los  */
export interface InfoAction {
  /**Indice de la accion que se tuvo en cuenta */
  indexActionSelected: number | number[];
}




export interface IAdapterDroneTf {
  targetY:number;
  
  /** Crea el tensor con el estado del dron (OJO, recordar liberarlo) */
  getStateTensor: () => tf.Tensor2D;
  /** Pasandole el tensor con los estados finitos, controla el dron
   * @param data datos de entrada
   * @param forcedI si el indice a seleccionar viene prefijado
   */
  setControlData: (data: tf.Tensor2D | undefined, ...forcedI: Array<number|undefined>) => InfoAction | undefined ;
  getMappedTensor: (dataXY: number[][])=> tf.Tensor2D ;
  /** Basicamente para depuración, la fuerza aplicada finalmente */
  TotalRelativeForce: (index: number | number[])=>number;
}

/** Version del interface mas avanzada para 3D */
export interface IAdapterDrone3D{
  target3D: THREE.Vector3;
  /**Tamaños en los que dividimos nosotros las salidas de la red */
  outputSizes:number[];
  /** Crea el tensor con el estado del dron (OJO, recordar liberarlo) */
  getStateTensor: () => tf.Tensor2D;
  /** Pasandole el tensor con los estados finitos, controla el dron
   * @param data datos de entrada
   * @param forcedI si el indice a seleccionar viene prefijado
   */
  setControlData: (data: tf.Tensor2D | undefined, ...forcedI: Array<number|undefined>) => InfoAction | undefined ;
  getMappedTensor: (dataXY: number[][])=> tf.Tensor2D ;
  /** Basicamente para depuración, la fuerza aplicada finalmente */
  //TotalRelativeForce: (index:number)=>number;
}

/**
 * Sirve para enlazar tensores de tf y el drone
 */
export default class AdapterDroneTf implements IAdapterDroneTf {
  /** Simple simplificación segun la accion, la fuerza que le pedimos al dron. Creciente en potencia */
  private forces: number[];
  /**El target de la posición deseada */
  public targetY = 6;
  public target3D= new THREE.Vector3(0,6,0);
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
   * @param forcedI El indice de la opcion seleccionada a la fuerza
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
    return { indexActionSelected: i };
  }

  public TotalRelativeForce(index: number | number[]): number {
    const i=(typeof(index) === 'number')?index: index[0];
    return this.forces[i] / this.drone.FuerzaNeutra;
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
      const posY = this.normalizePosY(value[0]);
      const velY = this.normalizeVely(value[1]);
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

  public normalizePosY(posY: number): number {
    const r = THREE.MathUtils.clamp(posY - this.targetY, -20, 20);
    //r = THREE.MathUtils.mapLinear(posY, -20, 20, -1, 1);
    return r;
  }

  // eslint-disable-next-line class-methods-use-this
  public normalizeVely(vely: number): number {
    const r = THREE.MathUtils.clamp(vely, -4, 4);
    //r = THREE.MathUtils.mapLinear(r, -3, 3, -1, 1);
    return r;
  }
}

/** Adapta los tensores de control obtenido al manejo del dron deseado.
 * En este caso, no es la potencia final que se desa, sino simplemente subir o bajar esa potencia
 * además de la posición relativa al target y la velocidad, también devuelve la f sentida por el dron
 */
export class AdapterDroneTf2 implements IAdapterDroneTf {
  private currentForceIndex=0;
  private forces: number[];
  /**El target de la posición deseada */
  public targetY = 6;
  public target3D= new THREE.Vector3(0,6,0);

  constructor(private drone: TDrone3D) {
    //entre [0,2] con resolucion 0.1
    const step=0.1;
    const ln=2/step+1;
    this.forces=Array.from({length:ln}, (item, index) =>{ return drone.FuerzaNeutra * (index*step);});
  }

  /**
 * El estado del dron para solo 1D, normalizando sus variables entre [-1,1]
 * @returns Posicion relativa, velocidad
 */
  public getStateTensor(): tf.Tensor2D {
    const posY = this.normalizePosY(this.drone.Position.y);
    const velY = this.normalizeVely(this.drone.Velocity.y);
    const fY=this.drone.NetForce.y;
    return tf.tensor2d([[posY, velY,fY]]);
  }

  /**
   * Toma la predicción obtenida de la red, y la traduce en el control al dron
   * 
   * @param data El array con las posibilidades de cada accion
   * @param forcedI El indice de la opcion seleccionada a la fuerza
   * @returns Información sobre la acción ejecutada
   */
  public setControlData(data: tf.Tensor2D | undefined, forcedI?: number): InfoAction | undefined {
    if (!data) return;
   
    const tensorData = data.dataSync();   
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
    //El 0=>bajar, 1=>igual, 2=>subir
    let nextForce=this.currentForceIndex;
    switch(i){
      case 0 :
         nextForce-=1;
         break;
      case 2: 
        nextForce+=1;
        break;
    }
    if(nextForce<0) nextForce=0;
    if(nextForce>=this.forces.length) nextForce=this.forces.length-1;
    const fNecesaria = this.forces[nextForce];
    this.currentForceIndex=nextForce;
    this.drone.TotalForce = fNecesaria;
    //console.log(`Drone Action: ${i} -> TotalForce:${(fNecesaria / this.drone.FuerzaNeutra).toFixed(2)}`);
    return { indexActionSelected: i };
  }

  public normalizePosY(posY: number): number {
    const r = THREE.MathUtils.clamp(posY - this.targetY, -20, 20);
    //r = THREE.MathUtils.mapLinear(posY, -20, 20, -1, 1);
    return r;
  }

  // eslint-disable-next-line class-methods-use-this
  public normalizeVely(vely: number): number {
    const r = THREE.MathUtils.clamp(vely, -4, 4);
    //r = THREE.MathUtils.mapLinear(r, -3, 3, -1, 1);
    return r;
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
      const posY = this.normalizePosY(value[0]);
      const velY = this.normalizeVely(value[1]);
      return [posY, velY];
    });
    return tf.tensor2d(arrXY);
  }

  public TotalRelativeForce(index: number | number[]): number {
    const i=(typeof(index) === 'number')?index: index[0];
    return this.forces[i] / this.drone.FuerzaNeutra;
  }
}

/** Adaptador para un dron que se mueve en 2D */
export class AdapterDrone2D implements IAdapterDrone3D {
  private minClampPos=new THREE.Vector3(-20,-20,-20);
  private maxClampPos=new THREE.Vector3(20,20,20);
  private minClampVel=new THREE.Vector3(-4,-4,-4);
  private maxClampVel=new THREE.Vector3(4,4,4);
  private relativePos=new THREE.Vector3(0,0,0);
  private ClampedVel=new THREE.Vector3(0,0,0);
  private currentForceIndex=0;  
  /** Fuerza en el sentido de los rotores */
  private forces: number[];
  /**Tamaños en los que dividimos nosotros el sentido del número de entradas */
  public outputSizes=[3,3];
  /**El target de la posición deseada */
  public target3D= new THREE.Vector3(0,6,0);

  constructor(private drone: TDrone3D) {
    //entre [0,2] con resolucion 0.1
    const step=0.1;
    const ln=2/step+1;
    this.forces=Array.from({length:ln}, (item, index) =>{ return drone.FuerzaNeutra * (index*step);});
  }

  /**
 * El estado del 
 * @returns Posicion relativa, velocidad
 */
  public getStateTensor(): tf.Tensor2D {
    this.relativePos.copy(this.drone.Position); //Copiando, evitamos recrear objetos
    this.relativePos.sub(this.target3D);
    this.relativePos.clamp(this.minClampPos, this.maxClampPos); //se limita los valores de la posición relativa
    this.ClampedVel.copy(this.drone.Velocity).clamp(this.minClampVel, this.maxClampVel);
    const force=this.drone.NetForce;
    return tf.tensor2d([[this.relativePos.x, this.relativePos.y, this.ClampedVel.x, this.ClampedVel.y, force.x, force.y]]);
  }

  /**
   * Toma la predicción obtenida de la red, y la traduce en el control al dron
   * 
   * @param data El array con las posibilidades de cada accion. Las 3 primeras son la variación de fuerza, las 3 siguienes son el roll (giro en torno a Z)
   * @param forcedI El indice de la opcion seleccionada a la fuerza
   * @returns Información sobre la acción ejecutada
   */
  public setControlData(data: tf.Tensor2D | undefined, ...forcedI: Array<number|undefined>): InfoAction | undefined {
    if (!data) return;
   
    const tensorData = data.dataSync() as Float32Array;   
    let iForce = 0;
    let iPitch=3;
    if (forcedI[0] === undefined) {
      const mr=AdapterDrone2D.getMaxReward(tensorData,0,3);
      iForce=mr.maxIndex;
    } else {
      iForce= forcedI[0];
    }
    if(forcedI[1]===undefined){
      const mr=AdapterDrone2D.getMaxReward(tensorData,3,3);
      iPitch=mr.maxIndex;
    }
    //tf.topk() Nos devuelve el maximo y el indice tambien
    //El 0=>bajar, 1=>igual, 2=>subir
    let nextForce=this.currentForceIndex;
    switch(iForce){
      case 0 :
         nextForce-=1;
         break;
      case 2: 
        nextForce+=1;
        break;
    }
    if(nextForce<0) nextForce=0;
    if(nextForce>=this.forces.length) nextForce=this.forces.length-1;
    const fNecesaria = this.forces[nextForce];
    this.currentForceIndex=nextForce;
    this.drone.TotalForce = fNecesaria;
    //console.log(`Drone Action: ${i} -> TotalForce:${(fNecesaria / this.drone.FuerzaNeutra).toFixed(2)}`);
    return { indexActionSelected: [iForce, iPitch]};
  }

  

  /**
   * 
   * @param dataXY array de [x0, y0, velY, pitch]
   * @returns un tensor ajustado según el propio adaptador
   */
  public getMappedTensor(dataXY: number[][]): tf.Tensor2D {
    throw new Error('Function not implemented.');
    //if (dataXY.length !== 2) throw new Error('Tiene que tener un array X y otro Y de identicas dimensiones');
    //Devuelve un array con vectores[y, vely]
    const relativePos=new THREE.Vector3();
    const clampedVel=new THREE.Vector3();
    const arrXY = dataXY.map((value) => {
      relativePos.set(value[0],value[1],0);
      relativePos.sub(this.target3D).clamp(this.minClampPos, this.maxClampPos);
      
      clampedVel.set(value[0],value[1],0).clamp(this.minClampVel, this.maxClampVel);
      return [relativePos.x, relativePos.y];
    });
    return tf.tensor2d(arrXY);
  }

  public TotalRelativeForce(index: number): number {
    return this.forces[index] / this.drone.FuerzaNeutra;
  }

  /**
   * Devuelve el indice con la maxima recompensa en ese intervalo
   * @param data 
   * @param i0 
   * @param len 
   * @returns El indice basado en el array completo
   */
  private static getMaxReward(data: Float32Array, i0:number, len:number): { maxIndex: number; maxValue: number; }{
    let maxValue=data[i0];
    let maxIndex=i0;
    const f=i0+len;
    for(let i=i0+1; i<f; i++){
      if(data[i]>maxValue){
        maxValue=data[i];
        maxIndex=i;
      }
    }
    return{maxIndex,maxValue};
  }
}