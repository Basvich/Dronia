import { Component, IterableDiffers } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';



interface IData1{ 
  states:number[][];
  reward:number[][] | number[];
}

interface ITensorFloat{
  data:Float32Array;
  shape:number[];
}

interface IDataModelSerial{
  weights: ITensorFloat[];
}


@Component({
  selector: 'app-test-models',
  templateUrl: './test-models.component.html',
  styleUrls: ['./test-models.component.scss']
})
export class TestModelsComponent {
  data1?:IData1;
  targetY=6;
  inputNumStates=2;
  outputNumActions=2;
  model: tf.LayersModel | undefined;

  public handleCreateModel(){
    if(this.model)this.model.dispose();
    this.model=this.CreateModel1(); //this.CreateModelSimpleFunction();
    this.data1=this.createDataToLearn(); // this.createDataToLearnNotNormalized();    
  }

  public async handleTrainModel() {
    //await this.TrainModelSimpleFunct();
    await this.Train();
  }

  public handleTestModel(){
    this.testModelData1();//this.testModelDataSimpleLinear();
    this.testModelData1b();
  } 

  public createDataToLearn():IData1{
    const range=10; //El ancho total en X
    const length=5000;
    const step=range/length;
    const maxRewardValue=10;
    const c=maxRewardValue/(range);
    const posY=Array.from({length}, (item, index)=>{return index*step;});
    const velY=Array.from({length:posY.length}, (item, index)=>{return index;});
    const reward=posY.map((v)=>c*v); 
    const reward2=posY.map((v)=> maxRewardValue-c*v);    
    const posYn=posY.map((v)=>this.normalizePosY(v));
    const velYn=velY.map((v)=>this.normalizeVely(v));   
    const states=posYn.map((v,i) => [v, velYn[i]]);
    const rewards=reward.map((v,i)=>[v,reward2[i]]);
    return {states, reward:rewards};
  }

  public createDataToLearnNotNormalized():IData1{
    const range=10;
    const length=10000;
    const maxRewardValue=100;
    const c=maxRewardValue/(range*range);
    const step=range/length;
    const posY=Array.from({length}, (item, index)=>{return index*step;});
    const velY=Array.from({length:posY.length}, (item, index)=>{return index;});
    const reward=posY.map((v)=>c*v*v);    
    const posYn=posY;//posY.map((v)=>this.normalizePosY(v));
    const velYn=velY;//velY.map((v)=>this.normalizeVely(v));   
    const states=posYn.map((v,i) => [v, velYn[i]]);
    return {states, reward};
  }

  public async Train(){
    //Tensor de entrada
    if(!this.data1 || !this.model) return;
    const x0=this.data1.states;
    const xs = tf.tensor2d(x0, [x0.length, this.inputNumStates]); 
    const y0=this.data1.reward;
    const ys = tf.tensor2d(y0, [y0.length, this.outputNumActions]);
    const printCallback = {
      onEpochEnd: (epoch: number, log: unknown) => {
        console.log(epoch, log);
      }
    };
    const args: tf.ModelFitArgs = { epochs: 30, batchSize:64, callbacks:printCallback };
    const h = await this.model.fit(xs, ys, args);
    xs.dispose();
    ys.dispose();
    console.log(h);
  }

  /**
   * Entrena el modelo simple de 1 dato una salida
   * @returns 
   */
  public async TrainModelSimpleFunct(){
    //Tensor de entrada
    if(!this.data1 || !this.model) return;
    const x0=this.data1.states.map((v)=>v[0]);
    const xs = tf.tensor(x0); 
    const y0=this.data1.reward;
    const ys = tf.tensor(y0);
    const printCallback = {
      onEpochEnd: (epoch: number, log: unknown) => {
        console.log(epoch, log);
      }
    };
    const args: tf.ModelFitArgs = { epochs: 30, batchSize:64, callbacks:printCallback};
    const h = await this.model.fit(xs, ys, args);
    xs.dispose();
    ys.dispose();
    console.log(h);
  }

  /**
   * Prueba el modelo que es similar al del drone
   * Prueba con los mismos datos de partida, ejecutando uno a uno cada par.
   * 
  */
  public testModelData1(){
    //Damos los datos de entrada de nuevo
    if(!this.data1 || !this.model) return;
    const x0=this.data1.states;
    const rew=[];
    let i=0;
    for(const x of x0)    {
      const droneState=tf.tensor2d([[x[0], x[1]]]);
      const r = this.predict(droneState);
      droneState.dispose();      
      if(!r) continue;
      const tensorData = r.dataSync();
      r.dispose();
      const ar=Array.from(tensorData)
      if(i%100===0){
        console.log(`${i} pos: ${x[0]}  vel: ${x[0]}  --> ${tensorData[0]}`);
      }
      rew.push(ar);
      i++;
    }
    const rew2=rew.filter((v,i)=>i%100===0);
    console.log(rew2);
  }

  public testModelData1b(){
    //Damos los datos de entrada de nuevo
    if(!this.data1 || !this.model) return;
    const x0=this.data1.states;    
    const xs=x0.map((v,index)=> [v[0], v[1]]);
    const res = tf.tidy(() => {
      const next = tf.tensor(xs);
      return this.model!.predict(next);
    });   
    const res2=(<tf.Tensor<tf.Rank>>res);
    const values = (<tf.Tensor<tf.Rank>>res).dataSync();
    res2.dispose();     
    const rew2=values.filter((v,i)=>i%100===0);
    console.log(rew2);
  }

  /**
   * Prueba el modelo simple de una simple función
   * @returns 
   */
  public testModelDataSimpleLinear(){
    //Damos los datos de entrada de nuevo
    if(!this.data1 || !this.model) return;
    const x0=this.data1.states.map((v)=>v[0]);
    //const rew=[];
    const res = tf.tidy(() => {
      const next = tf.tensor(x0);
      return this.model!.predict(next);
    });
    const values = (<tf.Tensor<tf.Rank>>res).dataSync();
    (<tf.Tensor<tf.Rank>>res).dispose();
    const rew=Array.from(values);
    //console.log(rew);
  }

  public normalizePosY(posY:number):number{
    let r = THREE.MathUtils.clamp(posY - this.targetY, -20, 20);
    r = THREE.MathUtils.mapLinear(posY, -20, 20, -1, 1);
    return r;
  }

  // eslint-disable-next-line class-methods-use-this
  public normalizeVely(vely:number):number{
    let r = THREE.MathUtils.clamp(vely, -3, 3);
    r = THREE.MathUtils.mapLinear(r, -3, 3, -1, 1);
    return r;
  }

  predict(states: tf.Tensor | tf.Tensor[]):tf.Tensor2D | undefined {
    if (!this.model) return undefined;
    return tf.tidy(() => this.model?.predict(states)) as tf.Tensor2D;
  }

  public serializeDeserializeModel(){
    if(!this.model) return;
    const ss=this.serializeModel(this.model);
    this.loadSerializeInModel(this.model, ss);
    console.log('--------- OK deserializacion ---------')
  }

  private CreateModel1():tf.Sequential{    
    const hiddenLayerSizes = [20, 20];        
    const network = tf.sequential();
    hiddenLayerSizes.forEach((hiddenLayerSize, i) => {
      network.add(tf.layers.dense({
        units: hiddenLayerSize,
        activation: 'relu',
        // `inputShape` is required only for the first layer.
        inputShape: i === 0 ? [this.inputNumStates] : undefined,
        //biasInitializer:tf.initializers.zeros (), //Notar que forzamos una inicialización a 0 para probar
        //kernelInitializer:tf.initializers.zeros ()
      }));
    });
    network.add(tf.layers.dense({ units: this.outputNumActions,
        //kernelInitializer:tf.initializers.zeros ()
      }));
    network.summary();
    network.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    return network;
  }


  // eslint-disable-next-line class-methods-use-this
  private CreateModelSimpleFunction(): tf.Sequential {
    const model = tf.sequential();
    //Entradas
    model.add(tf.layers.dense({
      inputShape: [1],
      units: 20,
      activation: 'relu',
    }));
    //intermedia
    model.add(
      tf.layers.dense({
        units: 20,
        activation: 'relu',
      })
    );
    //Salida
    model.add(
      tf.layers.dense({
        units: 1,
      })
    );
    // Compile for training
    model.summary();
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
    });
    return model;
  }

  private serializeModel(model: tf.LayersModel): IDataModelSerial{
    const ws=model.getWeights(true);
    const res:ITensorFloat[] =[];
    for(const w of ws){
      const data=w.dataSync() as Float32Array;  
      const shape=w.shape;   
      res.push({data,shape});
    }
    //ws.forEach((w)=>w.dispose());
    return {weights:res};
  }

  private loadSerializeInModel(destModel: tf.LayersModel, data:IDataModelSerial ){
    const weights: Array<tf.Tensor<tf.Rank>> =[];
    for(const f of data.weights){
      const w=tf.tensor(f.data, f.shape);
      weights.push(w);
    }
    destModel.setWeights(weights);
    //weights.forEach((w)=>w.dispose());
  }
}
