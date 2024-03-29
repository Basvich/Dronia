import * as tf from '@tensorflow/tfjs';
import { rand } from '@tensorflow/tfjs';
//import * as _ from 'lodash';
import { InfoAction } from './AdapterDroneTf';

/**
 * Un paso de lo almacenado
 */
export interface IActionReward<TState, TAction> {
  /** estado actual */
  currentState: TState;// tf.Tensor2D;
  /** Conjunto de acciones tomadas */
  action: TAction;//tf.Tensor2D;
  /** Información para evitar recalculos */
  info: InfoAction;
  /**recompensa en este estado (corresponde a la accion tomada en el estado anterior) */
  reward: number;
}


export interface IActionReplay<TState, TAction>{
   current: IActionReward<TState, TAction>;
   //next?: IActionReward<TState, TAction>;
   /**El maximo valor de todas las que siguen */
   nextMaxReward:number;
   /**La media de recompensa de todos los que siguen */
   nextMeanReward:number;
}
/**
 * Sirve para almacenar las acciones de un ciclo de simulacion (hasta que se estrella o timeout)
 */
export class ActionsMemory<TState extends tf.Tensor, TAction extends tf.Tensor > {
  private finalized = false;
  data: IActionReward<TState, TAction>[] = [];
  totalReward = 0;
  finalReward = 0;

  public constructor(public maxLength: number) { }

  /**Guarda una acción junto la recompensa obtenida (despues de simular el cambio del sistema con la acción) */
  public add(sample: IActionReward<TState, TAction>) {
    if (this.finalized) throw new Error("aldready finalized");
    this.data.push(sample);
    if (this.data.length > this.maxLength) {
      //console.log(`[ActionsMemory] len: ${this.data.length} max: ${this.maxLength}`);
      const [first] = this.data.splice(0, 1);
      if (first) {  //Es necesario liberar los tensores almacenados
        //console.log('deleted');
        first.currentState.dispose();        
        first.action.dispose();
      }
    }
  }

  /**Finaliza y normaliza todos los samples repartiendo el premio final entre todos los samples */
  public finalize(lastReward: number, numItems=32) {
    if (this.finalized) return;
    this.finalized = true;
    /* const d = lastReward / this.data.length;
    this.data.forEach((value) => value.reward += d); */
    //this.data[this.data.length - 1].reward+=lastReward;
    this.distributeLinear(lastReward, numItems);
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

  public getAllSamples():IActionReplay<TState, TAction>[]{
    const f=this.data.length-1;   
    const res : IActionReplay<TState, TAction>[]=new Array<IActionReplay<TState, TAction>>(this.data.length); 
    let next:IActionReward<TState, TAction> | undefined=undefined;
    let nextMaxReward=this.data[f].reward;
    let nextMeanReward=this.data[f].reward;
    let sum=0;
    let count=0;
    //Yendo hacia atras, rellenamos el maximo en cada paso bien y el next a la vez
    for(let i=f; i>=0; i--){
      const current=this.data[i];  

      if(next && next.reward>nextMaxReward) nextMaxReward=next.reward;      
      //res.push({ current, next, nextMaxReward});
      res[i]={ current, nextMaxReward, nextMeanReward};
      sum+=current.reward;
      count++;
      nextMeanReward=sum/count;      
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