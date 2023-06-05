import { ActionsMemory, IActionReward } from "./ActionsMemory";
import * as tf from '@tensorflow/tfjs';

describe('ActionMemory', () => {
  let expected = "";
  const am:ActionsMemory<tf.Tensor1D, tf.Tensor> = new ActionsMemory<tf.Tensor1D, tf.Tensor>(100);

  beforeEach(() => {
    expected = "Hello World";
  });

   afterEach(() => {
    expected = "";
  });  

  it("not lost memory", ()=>{
    const n0=tf.memory().numTensors;
    expect(n0===0);
    fill(am, 50);
    const n1=tf.memory().numTensors;
    expect(n1).toBe(100);
  });
});

function fill(am:ActionsMemory<tf.Tensor, tf.Tensor>, l:number){
  for(let i=0; i<l; i++)  {
    const currentState=tf.tensor1d([0]);
    const action=tf.tensor1d([1]);
    const sample:IActionReward<tf.Tensor1D, tf.Tensor> ={
      currentState,
      action,
      info: {indexActionY:0},
      reward: 0
    };
    am.add(sample);
  }
}