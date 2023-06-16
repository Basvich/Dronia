import * as THREE from "three";
import { TDrone3D } from "../Objects/Drone3D";
import { ActionsMemory, IActionReward } from "./ActionsMemory";
import AdapterDroneTf, { IAdapterDrone3D, IAdapterDroneTf, InfoAction } from "./AdapterDroneTf";
import { Model1D, NeuronalDronModel } from "./ModelIA1D";
import { TReward, TReward3D } from "./TRewards";
import * as tf from '@tensorflow/tfjs';
import { Random } from "../Objects/utils";

const MaxSteps = 1000;

export interface ICicleOptions {
  /** Factor de exploracion, en tre [0,1], es la probabilidad de seleccionar accion aleatoria */
  explorationF?: number;
  initialsPos?: Iterator<{ posY: number, velY: number }>;
}

export interface ICicle3DOptions {
  /** Factor de exploracion, en tre [0,1], es la probabilidad de seleccionar accion aleatoria */
  explorationF?: number;
  initialsPos?: Iterator<{ pos: [number, number, number], vel: [number, number, number], pith:number }>;
}

export interface LearnInfo{ 
  /** Ciclos completo de entrenamiento */
  cicleCount: number,
  /**Perdida de lo probado sobre lo entrenado */
  loss: number,
  /** Cuantos pasos en el ciclo hubo para simular */
  stepsCount:number
 }

/** Entorno para poder ir realizando el aprendizaje durante varios ciclos */
export class DroneLearnContext {
  /** El tiempo prefijado de cada salto de simulación */
  private LapseSegCicle = 0.1;
  private adapter: IAdapterDroneTf;// AdapterDroneTf;
  private jury = new TReward();
  private modelDummy: tf.LayersModel;
  private rnModel: NeuronalDronModel;

  public get NetModel() { return this.rnModel; }

  /** Limites de la escena actual por donde se mueve el drone */
  sceneLimits = new THREE.Box3(new THREE.Vector3(-20, -20, -20), new THREE.Vector3(20, 20, 20));
  /** Minima recompensa que nos saca */
  minReward = -20;

  public set targetY(v: number) {
    this.adapter.targetY = v;
    this.jury.targetY = v;
  }

  public constructor(private drone: TDrone3D, factoryRN: () => NeuronalDronModel, factoryAdapter: () => IAdapterDroneTf) {
    this.rnModel = factoryRN();
    this.adapter = factoryAdapter();//new AdapterDroneTf(drone);    
    this.modelDummy = this.createDummyModel();
  }

  public async LearnCicle(opt?: ICicleOptions) {
    const am: ActionsMemory<tf.Tensor2D, tf.Tensor2D> = new ActionsMemory<tf.Tensor2D, tf.Tensor2D>(5000);
    const rndExploracion = opt?.explorationF ?? 0.05; //por defecto Un 5% de escoger una ruta aleatoria
    let isDone = 0;
    let isInside = true;
    let stepCount = 0;

    this.drone.Reset(); //Partimos de la misma posición...
    let y0: number | undefined = undefined;
    let vy0: number | undefined = undefined;
    if (opt?.initialsPos) {
      const ip = opt.initialsPos.next();
      if (!ip.done) {
        y0 = ip.value.posY;
        vy0 = ip.value.velY;
      }
    }
    if (y0 === undefined) y0 = Random.gaussianRandom(6, 5);//Random.next(0.2, 11.8);
    if (vy0 === undefined) vy0 = Random.gaussianRandom(0, 2);

    this.drone.Position.set(0, y0, 0);
    this.drone.Velocity.set(0, vy0, 0);

    while (stepCount < MaxSteps && isInside) {
      const droneState = this.adapter.getStateTensor();
      const r = this.rnModel.predict(droneState);
      //console.log(r);
      let forcedI: number | undefined = undefined;
      if (Math.random() < rndExploracion) {
        forcedI = Math.floor(Math.random() * this.rnModel.outputNumActions);
      }
      const info = this.adapter.setControlData(r, forcedI);
      //Ciclos de simulación del objeto
      this.drone.Simulate(this.LapseSegCicle); //Simulamos en pasos de 100ms

      const reward = this.jury.InstanReward(this.drone);
      if (info !== undefined && (stepCount % 100 === 0 || forcedI !== undefined || (stepCount + 1 === MaxSteps))) {
        console.log(`${stepCount} -> pos:[${this.drone.Position.y}] vel:[${this.drone.Velocity.y}] rew:${reward}  force:${this.adapter.TotalRelativeForce(info.indexActionSelected)}  ${forcedI !== undefined ? 'RND' : ''}`);
      }
      stepCount++;
      isInside = reward >= this.minReward;//this.IsInBoundLimits(this.drone); 
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
    console.log(`Fuera de los limites ${stepCount}`);
    let lastReward = 0;
    if (!isInside) {
      lastReward = this.jury.badReward;
    } else if (isDone) {
      lastReward = isDone;
    }
    am.finalize(lastReward);
    await this.replayAndTrain(am);
    am.dispose();
  }

  public async LearnDummy() {
    const nSteps = 200;
    const scale = 1 / nSteps;
    const x0: number[][] = [];
    const y0: number[][] = [];
    for (let i = 0; i < nSteps; i++) {
      const x = i * scale;
      x0.push([x]);
      y0.push([10, 20]);
    }
    const xs = tf.tensor2d(x0, [x0.length, 1]); //Tensor con 100 (samples) * 2 valores
    const ys = tf.tensor2d(y0, [y0.length, 2]); //Tensor con 100 (samples) * 5 valores
    const args: tf.ModelFitArgs = { epochs: 40 };
    const h = await this.modelDummy.fit(xs, ys, args);
    console.log(h);
    for (let i = 0; i < nSteps; i += 10) {
      const tx = tf.tensor2d(x0[i], [1, 1]);
      const rx = this.dummyPredict(tx);
      tx.dispose();
      const data = rx?.dataSync();
      if (data) {
        console.log(`${i}, [${data[0]}, ${data[1]}]`);
      }
    }
  }

  /**
   * Para un conjunto de valores en un momento  ([posy,vely] o [posx,posy,vel,pith] o ...) predice las recompensas esperadas para cada posible acción
   * @param samples Conjunto de varios valores iniciales (cada valor incluye las distintas variables que alimentan la red)
   * @returns un conjunto con los valores esperados de recompensa para cada accion posible y para cada valor inicial (1 valor es un array de entradas)
   */
  public predictValues(samples: [number, number][]): number[][] {
    const res = [];
    const states = this.adapter.getMappedTensor(samples); //Obtiene un tensor con los distintos conjuntos de entrada
    const r = this.rnModel.predict(states);
    states.dispose();
    if (r) {
      const tensorData = r.dataSync();
      const nOuts = this.rnModel.outputNumActions;
      //Separamos en trozos de nOuts
      for (let i = 0; i < tensorData.length; i += nOuts) {
        const d = [];
        for (let j = 0; j < nOuts; j++) {
          d.push(tensorData[i + j]);
        }
        res.push(d);
      }
    }
    r?.dispose();
    return res;
  }

  public simulateCicle(posY: number, velY: number): { stepCount: number; lastReward: number; mean: number } {
    this.drone.Reset(); //Partimos de la misma posición...
    this.drone.Position.set(0, posY, 0);
    this.drone.Velocity.set(0, velY, 0);
    let isDone = 0;
    let isInside = true;
    let stepCount = 0;
    let reward = 0;
    const histRewards = [];
    while (stepCount < MaxSteps && !isDone && isInside) {
      const droneState = this.adapter.getStateTensor();
      const r = this.rnModel.predict(droneState);
      droneState.dispose();
      this.adapter.setControlData(r);
      r?.dispose();
      this.drone.Simulate(this.LapseSegCicle);
      reward = this.jury.InstanReward(this.drone);
      stepCount++;
      isInside = this.IsInBoundLimits(this.drone);
      isDone = this.jury.IsDone(this.drone);
      histRewards.push(reward);
    }
    let lastReward = 0;
    if (!isInside) {
      lastReward = this.jury.badReward;
    } else if (isDone) {
      lastReward = isDone;
    } else lastReward += this.jury.badMiniReward;
    lastReward += reward;
    histRewards[histRewards.length - 1] = lastReward;
    const mean = DroneLearnContext.mean(histRewards, 100);
    const res = { stepCount, lastReward, mean };
    return res;
  }

  /**
   * Toma el estado del drone asociado y lo controla con la prediccion de la red neuronal
   */
  public controlDrone() {
    const droneState = this.adapter.getStateTensor();
    const r = this.rnModel.predict(droneState);
    this.adapter.setControlData(r);
    r?.dispose();
    droneState.dispose();
  }

  public Dispose() {
    if (this.rnModel) {
      this.rnModel.dispose();
    }
  }

  dummyPredict(states: tf.Tensor | tf.Tensor[]): tf.Tensor2D | undefined {
    return tf.tidy(() => this.modelDummy.predict(states)) as tf.Tensor2D;
  }

  /** Repite los ultimos datos simulados, guardando los datos obtenidos de la simulación */
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
    let lastx0: number[] = [];
    let lasty0: number[] = [];
    /**Balanceo sobre la importancia de valor futuros o solo el actual ([0,1] mas alto mayor futuro) */
    const gamma = 0.7;

    batch.forEach((d) => {
      const state = d.current.currentState.dataSync();  //Un array con 2 valores float
      const staten = Array.from(state);
      x0.push(staten);
      lastx0 = staten;
      //Se modifica la recompensa del action tomado en este paso con la recompensa que se obtiene del siguiente paso
      //const yy=d.current.action.toFloat
      //Como no se puede modificar un dato de un tensor, hay que exportarlo, modificarlo y volver a crearlo.
      /* const buffer = tf.buffer(d.current.action.shape, d.current.action.dtype, d.current.action.dataSync());
      buffer.toTensor() */
      const currentQ = d.current.action.dataSync(); //Array con 5 floats
      const indexOfAction = d.current.info.indexActionSelected as number;
      const reward = (1 - gamma) * d.current.reward + gamma * d.nextMeanReward;
      currentQ[indexOfAction] = reward; //buffer.set(reward, indexOfAction); //actions[indexOfAction]=reward
      //const t = buffer.toTensor() as tf.Tensor2D;  //Se reconvierte a tensor
      lasty0 = Array.from(currentQ);
      y0.push(lasty0);
    });
    const xs = tf.tensor2d(x0, [x0.length, this.rnModel.inputNumStates]); //Tensor con 100 (samples) * 2 valores
    const ys = tf.tensor2d(y0, [y0.length, this.rnModel.outputNumActions]); //Tensor con 100 (samples) * 5 valores
    //Hay que entrenar el modelo con entradas igual a los estados almacenados y como salidas deseadas correspondiente a cada entrada el array de estados
    // eslint-disable-next-line no-await-in-loop
    const printCallback = {
      onEpochEnd: (epoch: number, log: unknown) => {
        console.log(epoch, log);
      },
    };
    const args: tf.ModelFitArgs = { epochs: 30, batchSize: 64, callbacks: printCallback };
    const h = await this.rnModel.train(xs, ys, args);
    console.log(h);
    const tLastX0 = tf.tensor2d([lastx0]);
    const tPredicted = this.rnModel.predict(tLastX0);
    const predicted = tPredicted?.dataSync();
    tLastX0.dispose();
    tPredicted?.dispose();
    console.log('ultimo y0', lasty0);
    console.log('prediccion', predicted);
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
  private createDummyModel(): tf.LayersModel {
    const inputNumStates = 1;
    const outputNumActions = 2;
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

  private static mean(data: number[], maxLength: number) {
    const l = Math.min(data.length, maxLength);
    const d = data.slice(-l);
    const sum = d.reduce((a, b) => a + b, 0);
    const avg = (sum / d.length) || 0;
    return avg;
  }
}

export class DroneLearn3DContext {
  /** El tiempo prefijado de cada salto de simulación */
  private LapseSegCicle = 0.1;
  private adapter: IAdapterDrone3D;// AdapterDroneTf;
  private jury = new TReward3D();
  private modelDummy: tf.LayersModel;
  private rnModel: NeuronalDronModel;

  public get NetModel() { return this.rnModel; }

  /** Limites de la escena actual por donde se mueve el drone */
  sceneLimits = new THREE.Box3(new THREE.Vector3(-20, -20, -20), new THREE.Vector3(20, 20, 20));
  /** Minima recompensa que nos saca de la simulacion */
  minReward = -100;

  public set targetPos(v: THREE.Vector3) {
    this.adapter.target3D.copy(v);
  }

  public constructor(private drone: TDrone3D, factoryRN: () => NeuronalDronModel, factoryAdapter: () => IAdapterDrone3D) {
    this.rnModel = factoryRN();
    this.adapter = factoryAdapter();//new AdapterDroneTf(drone);    
    this.modelDummy = this.createDummyModel();
  }

  public async LearnCicle(opt?: ICicle3DOptions): Promise<{ history: tf.History; steps: number; }> {
    const am: ActionsMemory<tf.Tensor2D, tf.Tensor2D> = new ActionsMemory<tf.Tensor2D, tf.Tensor2D>(5000);
    const rndExploracion = opt?.explorationF ?? 0.05; //por defecto Un 5% de escoger una ruta aleatoria
    let isDone = 0;
    let isInside = true;
    let stepCount = 0;

    this.drone.Reset(); //Partimos de la misma posición...
    let pos: number[] | undefined = undefined;
    let vel: number[] | undefined = undefined;
    let pitch:number | undefined;
    if (opt?.initialsPos) {
      const ip = opt.initialsPos.next();
      if (!ip.done) {
        pos = ip.value.pos;
        vel = ip.value.vel;
        pitch=ip.value.pith;
      }
    }   
    if(!pos){
      pos=[Random.gaussianRandom(0, 3), Random.gaussianRandom(6, 5), 0];
    }
    if(!vel){
      vel=[0, Random.gaussianRandom(0, 2), 0];
    }
    if(!pitch) pitch=Random.gaussianRandom(0,0.5);

    

    this.drone.Position.set(pos[0], pos[1], pos[2]);
    this.drone.Velocity.set(vel[0], vel[1], vel[2]);
    this.drone.Pitch=pitch;

    while (stepCount < MaxSteps && isInside) {
      const droneState = this.adapter.getStateTensor();
      const r = this.rnModel.predict(droneState);
      //console.log(r);
      let info: InfoAction | undefined = undefined;
      const randomExplore = Math.random() < rndExploracion;
      if (randomExplore) {
        const indexF = Random.nexti(0, this.adapter.outputSizes[0]);
        const indexPitch = Random.nexti(this.adapter.outputSizes[0], this.adapter.outputSizes[0] + this.adapter.outputSizes[1]);
        info = this.adapter.setControlData(r, indexF, indexPitch);
      } else {
        info = this.adapter.setControlData(r);
      }
      //Ciclos de simulación del objeto
      this.drone.Simulate(this.LapseSegCicle); //Simulamos en pasos de 100ms

      const reward = this.jury.InstanReward(this.drone);
      if (info !== undefined && (stepCount % 128 === 0 || (reward <= this.minReward))) {
        console.log(`${stepCount} -> pos:[${this.drone.Position.x.toFixed(2)}, ${this.drone.Position.y.toFixed(2)}] vel:[${this.drone.Velocity.y}] rew:${reward}  ${randomExplore ? 'RND' : ''}`);
      }
      stepCount++;
      isInside = reward >= this.minReward;//this.IsInBoundLimits(this.drone); 
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
    console.log(`Fuera de los limites ${stepCount}`);
    let lastReward = 0;
    if (!isInside) {
      lastReward = this.jury.badReward;
    } else if (isDone) {
      lastReward = isDone;
    }
    am.finalize(lastReward);
    const h=await this.replayAndTrain(am);
    am.dispose();
    return {history:h, steps:stepCount};
  }

  public async LearnDummy() {
    const nSteps = 200;
    const scale = 1 / nSteps;
    const x0: number[][] = [];
    const y0: number[][] = [];
    for (let i = 0; i < nSteps; i++) {
      const x = i * scale;
      x0.push([x]);
      y0.push([10, 20]);
    }
    const xs = tf.tensor2d(x0, [x0.length, 1]); //Tensor con 100 (samples) * 2 valores
    const ys = tf.tensor2d(y0, [y0.length, 2]); //Tensor con 100 (samples) * 5 valores
    const args: tf.ModelFitArgs = { epochs: 40 };
    const h = await this.modelDummy.fit(xs, ys, args);
    console.log(h);
    for (let i = 0; i < nSteps; i += 10) {
      const tx = tf.tensor2d(x0[i], [1, 1]);
      const rx = this.dummyPredict(tx);
      tx.dispose();
      const data = rx?.dataSync();
      if (data) {
        console.log(`${i}, [${data[0]}, ${data[1]}]`);
      }
    }
  }

  /**
   * Para un conjunto de valores en un momento  ([posy,vely] o [posx,posy,vel,pith] o ...) predice las recompensas esperadas para cada posible acción
   * @param samples Conjunto de varios valores iniciales (cada valor incluye las distintas variables que alimentan la red)
   * @returns un conjunto con los valores esperados de recompensa para cada accion posible y para cada valor inicial (1 valor es un array de entradas)
   */
  public predictValues(samples: [number, number][]): number[][] {
    const res = [];
    const states = this.adapter.getMappedTensor(samples); //Obtiene un tensor con los distintos conjuntos de entrada
    const r = this.rnModel.predict(states);
    states.dispose();
    if (r) {
      const tensorData = r.dataSync();
      const nOuts = this.rnModel.outputNumActions;
      //Separamos en trozos de nOuts
      for (let i = 0; i < tensorData.length; i += nOuts) {
        const d = [];
        for (let j = 0; j < nOuts; j++) {
          d.push(tensorData[i + j]);
        }
        res.push(d);
      }
    }
    r?.dispose();
    return res;
  }

  public simulateCicle(posY: number, velY: number): { stepCount: number; lastReward: number; mean: number } {
    this.drone.Reset(); //Partimos de la misma posición...
    this.drone.Position.set(0, posY, 0);
    this.drone.Velocity.set(0, velY, 0);
    let isDone = 0;
    let isInside = true;
    let stepCount = 0;
    let reward = 0;
    const histRewards = [];
    while (stepCount < MaxSteps && !isDone && isInside) {
      const droneState = this.adapter.getStateTensor();
      const r = this.rnModel.predict(droneState);
      droneState.dispose();
      this.adapter.setControlData(r);
      r?.dispose();
      this.drone.Simulate(this.LapseSegCicle);
      reward = this.jury.InstanReward(this.drone);
      stepCount++;
      isInside = this.IsInBoundLimits(this.drone);
      isDone = this.jury.IsDone(this.drone);
      histRewards.push(reward);
    }
    let lastReward = 0;
    if (!isInside) {
      lastReward = this.jury.badReward;
    } else if (isDone) {
      lastReward = isDone;
    } else lastReward += this.jury.badMiniReward;
    lastReward += reward;
    histRewards[histRewards.length - 1] = lastReward;
    const mean = DroneLearn3DContext.mean(histRewards, 100);
    const res = { stepCount, lastReward, mean };
    return res;
  }

  /**
   * Toma el estado del drone asociado y lo controla con la prediccion de la red neuronal
   */
  public controlDrone() {
    const droneState = this.adapter.getStateTensor();
    const r = this.rnModel.predict(droneState);
    this.adapter.setControlData(r);
    r?.dispose();
    droneState.dispose();
  }

  public Dispose() {
    if (this.rnModel) {
      this.rnModel.dispose();
    }
  }

  dummyPredict(states: tf.Tensor | tf.Tensor[]): tf.Tensor2D | undefined {
    return tf.tidy(() => this.modelDummy.predict(states)) as tf.Tensor2D;
  }

  /** Repite los ultimos datos simulados, guardando los datos obtenidos de la simulación */
  private async replayAndTrain(am: ActionsMemory<tf.Tensor2D, tf.Tensor2D>): Promise<tf.History> {
    /* const d1=[ [ 1, 2, 3 ], [ 4, 5, 6 ] ];
    const example1 = tf.tensor2d(d1);
    const example2 = tf.tensor2d({values: d1}); */

    /* Tenemos outputNumActions como posibles salidas, cada una de ellas tendrá una recompensa prevista, lo que queremos
    es entrenar la red para que maneje */
    let i = 0;

    const batch = am.getAllSamples();
    const x0: number[][] = [];
    const y0: number[][] = []; //
    let lastx0: number[] = [];
    let lasty0: number[] = [];
    /**Balanceo sobre la importancia de valor futuros o solo el actual ([0,1] mas alto mayor futuro) */
    const gamma = 0.7;

    batch.forEach((d) => {
      const state = d.current.currentState.dataSync();  //Un array con 2 valores float
      const staten = Array.from(state);
      x0.push(staten);
      lastx0 = staten;
      //Se modifica la recompensa del action tomado en este paso con la recompensa que se obtiene del siguiente paso
      //const yy=d.current.action.toFloat
      //Como no se puede modificar un dato de un tensor, hay que exportarlo, modificarlo y volver a crearlo.
      /* const buffer = tf.buffer(d.current.action.shape, d.current.action.dtype, d.current.action.dataSync());
      buffer.toTensor() */
      const currentQ = d.current.action.dataSync(); //Array con n grupos de n floats todos seguidos

      const reward = (1 - gamma) * d.current.reward + gamma * d.nextMeanReward;
      for (const indexOfAction of d.current.info.indexActionSelected as number[]) {
        currentQ[indexOfAction] = reward; //buffer.set(reward, indexOfAction); //actions[indexOfAction]=reward
      }

      //const t = buffer.toTensor() as tf.Tensor2D;  //Se reconvierte a tensor
      lasty0 = Array.from(currentQ);
      y0.push(lasty0);
    });
    const xs = tf.tensor2d(x0, [x0.length, this.rnModel.inputNumStates]); //Tensor con 100 (samples) * 2 valores
    const ys = tf.tensor2d(y0, [y0.length, this.rnModel.outputNumActions]); //Tensor con 100 (samples) * 5 valores
    //Hay que entrenar el modelo con entradas igual a los estados almacenados y como salidas deseadas correspondiente a cada entrada el array de estados
    // eslint-disable-next-line no-await-in-loop
    const printCallback = {
      onEpochEnd: (epoch: number, log: { [key: string]: number; } | undefined) => {
        if (log) {          
          if (isNaN(log['loss'])) {
            console.warn('Mal asunto');
          }
          //console.log(epoch, log);
        }
      },
    };
    const args: tf.ModelFitArgs = { epochs: 30, batchSize: 64, callbacks: printCallback };
    const h = await this.rnModel.train(xs, ys, args);
    console.log(h);
    const tLastX0 = tf.tensor2d([lastx0]);
    const tPredicted = this.rnModel.predict(tLastX0);
    const predicted = tPredicted?.dataSync();
    tLastX0.dispose();
    tPredicted?.dispose();
    console.log('ultimo y0', lasty0);
    console.log('prediccion', predicted);
    //model1D.model?.fit()
    xs.dispose();
    ys.dispose();
    i++;
    return h;
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
  private createDummyModel(): tf.LayersModel {
    const inputNumStates = 1;
    const outputNumActions = 2;
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

  private static mean(data: number[], maxLength: number) {
    const l = Math.min(data.length, maxLength);
    const d = data.slice(-l);
    const sum = d.reduce((a, b) => a + b, 0);
    const avg = (sum / d.length) || 0;
    return avg;
  }

}