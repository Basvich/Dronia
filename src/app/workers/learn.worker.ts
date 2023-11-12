
/// <reference lib="webworker" />

import { ICicle3DOptions, LearnInfo } from "../NetsIA/DroneLearnContext";
import { IStudentState, Student } from "../NetsIA/Students";
import { IDisposable, Random } from "../Objects/utils";
import * as tf from '@tensorflow/tfjs';


addEventListener('message', async ({ data }) => {
  console.log(`[learn.worker] Recibido para trabajar: "${data.name}" `);
  const learnr=new learnWorker(data);
  await learnr.learnCicles(); //learnr.learnCiclesTest();
  const nState=learnr.getState();
  learnr.dispose();
  console.log(`[learn.worker] acabó ciclo: "${data.name}" `);
  postMessage(nState);
  close();
});

class learnWorker implements IDisposable{
  private student:Student;
   /** Probabilidad en cada paso de seleccionar un valor aleatorio */
  exploracionFactor = 0.05;
  numCicles=3;
  constructor(public state:IStudentState){
    this.student=new Student();   
    this.student.loadSerializedState(state);
  }
  

  /** Para simular un proceso cualquiera consumiendo tiempo */
  public learnCiclesTest(){
    const start = Date.now();
    const segs=Random.next(2000,6000);
    while (Date.now() < start + segs) {}
    this.student.score=Random.nexti(-30,30);
    this.student.learnCicles+=1;
  }

  public async learnCicles(){
    const infos:LearnInfo[]=[];
    const opt: ICicle3DOptions = {
      explorationF: this.exploracionFactor,
      initialsPos: undefined //this.initialsPosIterator
    };    
    if(!this.student.learnContext){
      throw new Error('Unespected learnContext null');
    }
    for(let i=0; i<this.numCicles; i++){
      // eslint-disable-next-line no-await-in-loop
      const r=await this.student.learnContext.LearnCicleAgregated(opt);
      infos.push({
        cicleCount: 0,
        loss: learnWorker.lastLoss(r.history),
        reward: r.reward,
        stepsCount: r.steps
      });
      this.student.learnCicles+=1;
      console.log(`[learn.Worker] '${this.student.name}' ciclo ${i} finalizado`);
    }
    console.log(`[learn.Worker] '${this.student.name}' fin de ciclos`);
    const nfo=learnWorker.createInfo(infos, this.student.learnCicles );
    this.student.loss=nfo.loss;
    this.student.reward=nfo.reward??0;
  }



  public getState():IStudentState{
    return this.student.getSerializedState();
  }


  private static createInfo=(infos:LearnInfo[], cicleCount:number)=>{
    const red=infos.reduce((acum, value)=>{return {sLoss:acum.sLoss+value.loss, sTeps: acum.sTeps+value.stepsCount, sReward: acum.sReward+ ((value.reward)??0) };}, {sLoss:0, sTeps:0, sReward:0});
    const res:LearnInfo={        
        cicleCount,
        loss: red.sLoss/infos.length,
        reward: red.sReward/infos.length,
        stepsCount: red.sTeps/infos.length
    };
    return res;      
  };

  private static lastLoss=(hist:tf.History)=>{
    const losses=hist.history['loss'] as number[];
    const last=losses[losses.length-1]??-1;
    return last;
  };



  dispose(){
    this.student.dispose();
  }
}