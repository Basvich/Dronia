import { ILearnContextSerialized } from "../NetsIA/DroneLearn3DContext";

/** Si la clase necesita que se llame a dispose obligatoriamente */
export interface IDisposable{
  /* función a llamar (manualmente....) */
  dispose: ()=>void;
}

export interface ISerializable{
  getSerializedState: ()=>unknown;
  loadSerializedState: (state:unknown)=>void;
}

export class Random {
  /**
   * 
   * @param min 
   * @param max el maximo sin estar incluido
   * @returns 
   */
  public static next(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }


  public static nexti(min: number, max: number) {
    return Math.floor(this.next(min,max));
  }

  public static gaussianRandom(mean = 0, stdev = 1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
  }
}

export class MinLapseTroller{
  totalElapsedSg=0;
  public constructor(private minElapsedSg:number){
  }

  public ejecute(elapsedSg:number,callback: () => void){
    const t=this.totalElapsedSg+elapsedSg;
    if(t>=this.minElapsedSg){
      this.totalElapsedSg=0;
      callback();      
    }else{
      this.totalElapsedSg=t;
    }    
  }
}