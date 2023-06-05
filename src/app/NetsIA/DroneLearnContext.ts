import * as THREE from "three";
import { TDrone3D } from "../Objects/Drone3D";
import { ActionsMemory, IActionReward } from "./ActionsMemory";
import AdapterDroneTf from "./AdapterDroneTf";
import { Model1D } from "./ModelIA1D";
import { TReward } from "./TRewards";
import * as tf from '@tensorflow/tfjs';
import { Random } from "../Objects/utils";

const MaxSteps = 500;

/** Entorno para poder ir realizando el aprendizaje durante varios ciclos */
export class DroneLearnContext{
   private adapter:AdapterDroneTf;
   private jury = new TReward();
   private modelDummy:tf.LayersModel;
   /** La red que aprende */
   private model1D = new Model1D();
   /** Limites de la escena actual por donde se mueve el drone */
  sceneLimits = new THREE.Box3(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(12, 12, 12));
   
   public constructor(private drone: TDrone3D){
     this.adapter=new AdapterDroneTf(drone);
     this.model1D.createModel2();
     this.modelDummy=this.createDummyModel();
   }

   public async LearnCicle(){
    const am: ActionsMemory<tf.Tensor2D, tf.Tensor2D> = new ActionsMemory<tf.Tensor2D, tf.Tensor2D>(300);
    
    let isDone = false;
    let isInside = true;
    let stepCount = 0;
    this.drone.Reset(); //Partimos de la misma posición...
    const y0=Random.next(0.5, 11.5);
    const vy0=Random.next(-3, 3);
    this.drone.Position.set(0, y0, 0);
    this.drone.Velocity.set(0, vy0 ,0);
    
    while (stepCount < MaxSteps && !isDone && isInside) {
      const droneState = this.adapter.getStateTensor();
      const r = this.model1D.predict(droneState);
      //console.log(r);
      let forcedI: number | undefined=undefined;
      if(Math.random()<0.05){  //Un 5% de escoger una ruta aleatoria
        forcedI=Math.floor(Math.random()*5);
      }
      const info = this.adapter.setControlData(r, forcedI);
      //Ciclos de simulación del objeto
      this.drone.Simulate(0.1); //Simulamos en pasos de 100ms
      
      const reward = this.jury.InstanReward(this.drone);
      if(info!==undefined && (stepCount % 100 ===0 || forcedI!== undefined || (stepCount+1===MaxSteps)) ){
        console.log(`${stepCount} -> pos:[${this.drone.Position.y}] vel:[${this.drone.Velocity.y}] rew:${reward}  force:${this.adapter.TotalRelativeForce(info.indexActionY)}  ${forcedI!==undefined?'RND':''}`);      
      }
      stepCount++;
      isInside = this.IsInBoundLimits(this.drone);
      if (r && info) {
        const d: IActionReward<tf.Tensor2D, tf.Tensor2D> = {
          currentState: droneState,
          action: r,
          reward,
          info
        };
        am.add(d);
      }
      isDone = this.jury.IsDone(this.drone);
    }
    console.log('Fuera de los limites');
    let lastReward = 0;
    if (!isInside) {
      lastReward = this.jury.badReward;
    }  else if (isDone){
       lastReward = this.jury.goodReward;
    } else lastReward+=this.jury.badMiniReward;
    am.finalize(lastReward);
    await this.replayAndTrain(am);
    am.dispose();
   }

   public async LearnDummy(){
     const nSteps=200;
     const scale=1/nSteps;
     const x0: number[][] = [];
     const y0: number[][] = [];
     for(let i=0; i<nSteps; i++ ){
       const x=i*scale;
       x0.push([x]);
       y0.push([10, 20]);       
     }
     const xs = tf.tensor2d(x0, [x0.length, 1]); //Tensor con 100 (samples) * 2 valores
     const ys = tf.tensor2d(y0, [y0.length, 2]); //Tensor con 100 (samples) * 5 valores
     const args:tf.ModelFitArgs={epochs:40};
     const h=await this.modelDummy.fit(xs, ys, args);
     console.log(h);
     for(let i=0; i<nSteps; i+=10){
       const tx=tf.tensor2d(x0[i],[1,1]);
       const rx=this.dummyPredict(tx);
       tx.dispose();
       const data=rx?.dataSync();
       if(data){
        console.log(`${i}, [${data[0]}, ${data[1]}]`);
       }
     }
   }

   public predictValues(samples: [number, number][]):number[][] {
    const res=[];
     const states=this.adapter.getMappedTensor(samples);
     const r = this.model1D.predict(states);
     states.dispose();
     if(r){
      const tensorData = r.dataSync();
      //Separamos en trozos de 5
      for(let i=0; i<tensorData.length; i+=5){
        const d=[];
        for(let j=0; j < 5; j++){
          d.push(tensorData[i+j]);
        }
        res.push(d);
      }
     }
     r?.dispose();
     return res;
   }

   dummyPredict(states: tf.Tensor | tf.Tensor[]):tf.Tensor2D | undefined {    
    return tf.tidy(() => this.modelDummy.predict(states)) as tf.Tensor2D;
  }

   private async replayAndTrain(am: ActionsMemory<tf.Tensor2D, tf.Tensor2D>) {
    /* const d1=[ [ 1, 2, 3 ], [ 4, 5, 6 ] ];
    const example1 = tf.tensor2d(d1);
    const example2 = tf.tensor2d({values: d1}); */
    
    /* Tenemos outputNumActions como posibles salidas, cada una de ellas tendrá una recompensa prevista, lo que queremos
    es entrenar la red para que maneje */
    let i = 0;

    const batch = am.getAllSamples();
    const x0: number[][] = [];
    const y0: number[][] = []; //
    let lastx0:number[]=[];
    let lasty0:number[]=[];
    /**Balanceo sobre la importancia de valor futuros o solo el actual (mas alto mayor futuro) */
    const gamma=0.3;

    batch.forEach((d) => {
      const state = d.current.currentState.dataSync();  //Un array con 2 valores float
      const staten = Array.from(state);
      x0.push(staten);
      lastx0=staten;
      //Se modifica la recompensa del action tomado en este paso con la recompensa que se obtiene del siguiente paso
      //const yy=d.current.action.toFloat
      //Como no se puede modificar un dato de un tensor, hay que exportarlo, modificarlo y volver a crearlo.
      /* const buffer = tf.buffer(d.current.action.shape, d.current.action.dtype, d.current.action.dataSync());
      buffer.toTensor() */
      const currentQ = d.current.action.dataSync(); //Array con 5 floats
      const indexOfAction = d.current.info.indexActionY;
      const reward = (1-gamma)*d.current.reward + gamma*d.nextMaxReward;
      currentQ[indexOfAction] = reward; //buffer.set(reward, indexOfAction); //actions[indexOfAction]=reward
      //const t = buffer.toTensor() as tf.Tensor2D;  //Se reconvierte a tensor
      lasty0=Array.from(currentQ);
      y0.push(lasty0);
    });
    const xs = tf.tensor2d(x0, [x0.length, this.model1D.inputNumStates]); //Tensor con 100 (samples) * 2 valores
    const ys = tf.tensor2d(y0, [y0.length, this.model1D.outputNumActions]); //Tensor con 100 (samples) * 5 valores
    //Hay que entrenar el modelo con entradas igual a los estados almacenados y como salidas deseadas correspondiente a cada entrada el array de estados
    // eslint-disable-next-line no-await-in-loop
    const args:tf.ModelFitArgs={epochs:20};
    const h=await this.model1D.train(xs, ys, args);
    console.log(h);
    const tLastX0=tf.tensor2d([lastx0]);
    const tPredicted=this.model1D.predict(tLastX0);
    const predicted=tPredicted?.dataSync();
    tLastX0.dispose();
    tPredicted?.dispose();
    console.log('ultimo y0',lasty0);
    console.log('prediccion',predicted);
    //model1D.model?.fit()
    xs.dispose();
    ys.dispose();
    i++;
  }

  /**
   * Devuelve true si está en la escena
   * @param drone 
   * @returns 
   */
  private IsInBoundLimits(drone: TDrone3D): boolean {
    return this.sceneLimits.containsPoint(drone.Position);
  }

  // eslint-disable-next-line class-methods-use-this
  private createDummyModel():tf.LayersModel{
    const inputNumStates=1;
    const outputNumActions=2;
    const hiddenLayerSizes = [5, 5];        
    const network = tf.sequential();
    hiddenLayerSizes.forEach((hiddenLayerSize, i) => {
      network.add(tf.layers.dense({
        units: hiddenLayerSize,
        activation: 'relu',
        // `inputShape` is required only for the first layer.
        inputShape: i === 0 ? [inputNumStates] : undefined
      }));
    });
    network.add(tf.layers.dense({ units: outputNumActions }));
    network.summary();
    network.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    return network;
  }
}