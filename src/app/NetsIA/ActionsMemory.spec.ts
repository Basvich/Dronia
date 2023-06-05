import { ActionsMemory, IActionReward } from "./ActionsMemory";
import * as tf from '@tensorflow/tfjs';

describe('ActionMemory', () => {
  let expected = "";
  //const am:ActionsMemory<tf.Tensor1D, tf.Tensor> = new ActionsMemory<tf.Tensor1D, tf.Tensor>(100);

  beforeEach(() => {
    expected = "Hello World";
  });

   afterEach(() => {
    expected = "";
  });  

  it("not lost memory", ()=>{
    let aml = new ActionsMemory<tf.Tensor1D, tf.Tensor>(100);
    const n0=tf.memory().numTensors;
    expect(n0===0);
    fill(aml, 50,(i)=> i);
    const n1=tf.memory().numTensors;
    expect(n1).toBe(100);
    aml.dispose();
    let nf=tf.memory().numTensors;
    expect(nf).toBe(0);
    //Forzando el reciclado interno de datos
    aml = new ActionsMemory<tf.Tensor1D, tf.Tensor>(10);
    fill(aml, 50, (i)=> i); 
    aml.dispose();
    nf=tf.memory().numTensors;
    expect(nf).withContext("forced more data than size").toBe(0);
  });


  it("Compute basic Rewards", () =>{
    const aml = new ActionsMemory<tf.Tensor1D, tf.Tensor>(100);
    const nItems=50;
    fill(aml, nItems, (i)=> i);  //
    aml.finalize(0);
    const samples=aml.getAllSamples();
    const samples2=samples.slice(0, samples.length-1);
    samples2.forEach((value,index)=>{
      expect(value.current.reward).toBe(index);
      expect(value.nextMaxReward).toBe(nItems-1);
    });
    const lastSample=samples[samples.length-1];
    expect(lastSample.nextMaxReward).toBe(nItems-1);
    expect(lastSample.current.reward).toBe(nItems-1);
    aml.dispose();    
  });

  it("Compute inverse Rewards", () =>{
    const aml = new ActionsMemory<tf.Tensor1D, tf.Tensor>(100);
    const nItems=10;
    const lastReward=2;  
    const lastRewardExpanded=2;
    const rewardF= (i:number)=> nItems-i;
    fill(aml, nItems, rewardF);  //incrementa desde 1 -> los ultimos n items
    aml.finalize(lastReward, lastRewardExpanded); 
    const finalReward=1+lastReward;
    expect(aml.finalReward) .toBe(finalReward);
    const samples=aml.getAllSamples();
    const samples2=samples.slice(0, samples.length-1);
    const testData=getRewArray(nItems, rewardF, lastReward, lastRewardExpanded);
    samples2.forEach((value,index)=>{             
      expect(value.current.reward).withContext(`i:${index} current`).toBe(testData[index].reward);     
      expect(value.nextMaxReward).withContext(`i:${index} nextMaxReward`).toBe(testData[index].nextMax);     
    });
    const lastSample=samples[samples.length-1];
    expect(lastSample.nextMaxReward).withContext('lastSample').toBe(testData[samples.length-1].reward);
    expect(lastSample.current.reward).withContext('lastSample').toBe(testData[samples.length-1].nextMax);
    aml.dispose();
  });
});

/** Rellena con l datos la memoria, empezando en 0, la recompensa crece con cada indice 
 * Se crean 2 tensores por cada item añadido
*/
function fill(am:ActionsMemory<tf.Tensor, tf.Tensor>, l:number, rewardF: (i:number)=>number){
  for(let i=0; i<l; i++)  {
    const currentState=tf.tensor1d([0]);
    const action=tf.tensor1d([1]);
    const sample:IActionReward<tf.Tensor1D, tf.Tensor> ={
      currentState,
      action,
      info: {indexActionY:0},
      reward: rewardF(i)
    };
    am.add(sample);
  }
}

function getRewArray(len:number,rewardF: (i:number)=>number, finalReward: number, finalItemsLen:number ){
  const res=Array.from({length:len}, (item, index) => {return {reward:rewardF(index), nextMax:0};});
  if(finalReward>0){    
    const i0=res.length-finalItemsLen;
    const m=finalReward/finalItemsLen;
    let acc=m;
    for(let i=i0; i<res.length; i++){
       res[i].reward+=acc;
       acc+=m;
    }
  }
  const f=res.length-1;
  res[f].nextMax=res[f].reward;
  let max=res[f].reward;
  for(let i=f-1; i>=0;i--){
    const next=res[i+1];
    if(max<next.reward) max=next.reward;
    res[i].nextMax=max;
  }
  return res;
}