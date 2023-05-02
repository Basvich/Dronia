import * as tf from '@tensorflow/tfjs';
import { rand } from '@tensorflow/tfjs';
import * as _ from 'lodash';

interface IActionReward {
  currentState: tf.Tensor2D;
  action:tf.Tensor2D;
  reward: number;
}
/**
 * Sirve para almacenar las acciones de un ciclo de simulacion (hasta que se estrella o timeout)
 */
export class ActionsMemory {
  private finalized=false;
  data: IActionReward[] = [];
  totalReward=0;
  finalReward=0;

  public constructor(public maxLength:number){}

  public add(sample: IActionReward) {
    if(this.finalized) throw new Error("aldready finalized");
    this.data.push(sample);
    if(this.data.length>this.maxLength){
      const [first]=this.data.splice(0);
      if(first){  //Es necesario liberar los tensores almacenados
        first.currentState.dispose();
        first.action.dispose();
      }
    }
  }

  /**Finaliza y normaliza todos los samples repartiendo el premio final entre todos los samples */
  public finalize(lastReward: number) {
    if(this.finalized) return;
    this.finalized=true;
    const d = lastReward / this.data.length;
    this.data.forEach((value) => value.reward += d);
    // eslint-disable-next-line no-param-reassign
    this.totalReward= this.data.reduce((acum, value)=>acum+=value.reward,0 );
    this.finalReward=this.data[this.data.length-1].reward;
  }

  public samples(nSamples:number): { current: IActionReward; next: IActionReward; }[]{
    const res=[];
    const max=this.data.length-1;
    for(let i=0; i<nSamples; i++){
      const index= Math.floor(Math.random() * max);
      const current=this.data[index];
      const next=this.data[index+1];
      res.push({current,next});
    }
    return res;
  }
}