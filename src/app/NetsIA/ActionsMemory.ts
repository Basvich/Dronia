import * as tf from '@tensorflow/tfjs';
import { rand } from '@tensorflow/tfjs';
//import * as _ from 'lodash';
import { InfoAction } from './AdapterDroneTf';

/**
 * Un paso de lo almacenado
 */
export interface IActionReward {
  /** estado actual */
  currentState: tf.Tensor2D;
  /** Conjunto de acciones tomadas */
  action: tf.Tensor2D;
  /** Información para evitar recalculos */
  info: InfoAction;
  /**recompensa en este estado (corresponde a la accion tomada en el estado anterior) */
  reward: number;
}


export interface IActionReplay{
   current: IActionReward;
   next?: IActionReward;
   nextMaxReward:number 
}
/**
 * Sirve para almacenar las acciones de un ciclo de simulacion (hasta que se estrella o timeout)
 */
export class ActionsMemory {
  private finalized = false;
  data: IActionReward[] = [];
  totalReward = 0;
  finalReward = 0;

  public constructor(public maxLength: number) { }

  /**Guarda una acción junto la recompensa obtenida (despues de simular el cambio del sistema con la acción) */
  public add(sample: IActionReward) {
    if (this.finalized) throw new Error("aldready finalized");
    this.data.push(sample);
    if (this.data.length > this.maxLength) {
      const [first] = this.data.splice(0);
      if (first) {  //Es necesario liberar los tensores almacenados
        first.currentState.dispose();
        first.action.dispose();
      }
    }
  }

  /**Finaliza y normaliza todos los samples repartiendo el premio final entre todos los samples */
  public finalize(lastReward: number) {
    if (this.finalized) return;
    this.finalized = true;
    /* const d = lastReward / this.data.length;
    this.data.forEach((value) => value.reward += d); */
    //this.data[this.data.length - 1].reward+=lastReward;
    this.distributeLinear(lastReward, 32);
    // eslint-disable-next-line no-param-reassign
    this.totalReward = this.data.reduce((acum, value) => acum += value.reward, 0);
    this.finalReward = this.data[this.data.length - 1].reward;
    console.log(`finalizado con recompensa final: ${(this.data[this.data.length - 1].reward).toFixed(2)}  media:${(this.totalReward/this.data.length).toFixed(2)}`);
  }

  /**
   * Distribuye linealmente el premio a los ultimos elementos, al ultimo se le añade todo, y hacia atras cada vez menos.
   * @param reward 
   * @param backItems 
   */
  private distributeLinear(reward:number, backItems:number){
    if(!reward) return;
    const l=Math.min(backItems, this.data.length);
    const i0=this.data.length-l;
    const m=reward/l;
    let acc=m;
    for(let i=i0; i<this.data.length; i++){
       this.data[i].reward+=acc;
       acc+=m;
    }
  }

  /**
   * Devuelve samples tomados aleatoriamente
   * @deprecated
   * @param nSamples Cuantos samples, si no está se devuelven todos en el orden original
   * @returns un array de los samples con la recompensa del estado siguiente
   */
  public samples(nSamples?: number): { current: IActionReward; next: IActionReward; }[] {    
    const max = this.data.length - 1;
    const res = [];
    if (nSamples) {
      for (let i = 0; i < nSamples; i++) {
        const index = Math.floor(Math.random() * max);
        const current = this.data[index];
        const next = this.data[index + 1];
        res.push({ current, next });
      }
    } else {
      for(let i=0; i<max; i++){
        const current=this.data[i];
        const next=this.data[i + 1];
        res.push({ current, next });
      }
    }
    return res;
  }

  public getAllSamples():IActionReplay[]{
    const f=this.data.length-1;   
    const res : IActionReplay[]=new Array<IActionReplay>(this.data.length); 
    let next:IActionReward | undefined=undefined;
    let nextMaxReward=this.data[f].reward;
    //Yendo hacia atras, rellenamos el maximo en cada paso bien y el next a la vez
    for(let i=f; i>=0; i--){
      const current=this.data[i];    
      if(next && next.reward>nextMaxReward) nextMaxReward=current.reward;
      //res.push({ current, next, nextMaxReward});
      res[i]={ current, next, nextMaxReward};
      next=current;
    }
    return res;
  }

  public dispose() {
    this.data.forEach((element) => {
      element.currentState.dispose();
      element.action.dispose();
    });
  }
}