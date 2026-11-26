import * as THREE from "three";
import { IAdapterDrone3D } from "./AdapterDroneTf";
import { NeuronalDronModel } from "./ModelIA1D";
import { TReward3D } from "./TRewards";
import { TDrone3D } from "../Objects/Drone3D";
import { ActionsMemory, IActionReplay } from "./ActionsMemory";
import * as tf from '@tensorflow/tfjs';
import { ICicle3DOptions } from "./DroneLearnContext";
import { IDisposable, ISerializable, Random } from "../Objects/utils";

/** El maximo de samples en cada simulación. Evita que se quede en una situación estable infinatemente */
const MaxSteps = 1000;
/** El mínimo de samples que queremos para poder entrenar la red */
const MinNumSamples = 1000;

export interface ITensorFloat{
  data:Float32Array;
  shape:number[];
}

export interface IDataModelSerial{
  weights: ITensorFloat[];
}

export interface ILearnContextSerialized{
  /** Los datos del modelo de la red */
  modelRN:IDataModelSerial;
}

export interface ISimulateCfg{
  pos:[x:number, y:number, z:number],
  vel?:[x:number, y:number, z:number],
  /** Máximo numero de pasos */
  maxSteps?:number,
  /** Si se alcanza esta mínima recompensa, salimos */
  minReward?:number
}

export class DroneLearn3DContext implements ISerializable, IDisposable {
  /** El tiempo prefijado de cada salto de simulación */
  private LapseSegCicle = 0.1;
  private adapter: IAdapterDrone3D;// AdapterDroneTf;
  private jury = new TReward3D();
  private modelDummy?: tf.LayersModel;
  private rnModel: NeuronalDronModel;

  public get NetModel() { return this.rnModel; }

  /** Limites de la escena actual por donde se mueve el drone */
  sceneLimits = new THREE.Box3(new THREE.Vector3(-20, -20, -20), new THREE.Vector3(20, 20, 20));
  /** Minima recompensa que nos saca de la simulacion */
  minReward = -100;

  public set targetPos(v: THREE.Vector3) {
    this.adapter.target3D.copy(v);
    this.jury.target.copy(v);
  }

  public constructor(private drone: TDrone3D, factoryRN: () => NeuronalDronModel, factoryAdapter: () => IAdapterDrone3D) {
    this.rnModel = factoryRN();
    this.adapter = factoryAdapter();//new AdapterDroneTf(drone);    
    //this.modelDummy = this.createDummyModel();
  }

  public async LearnCicle(opt?: ICicle3DOptions): Promise<{ history: tf.History; steps: number; }> {
    const am = new ActionsMemory<tf.Tensor2D, tf.Tensor2D>(5000);
    try {
      const steps = this.collectCicle(am, opt);
      const history = await this.replayAndTrain(am.getAllSamples());
      return { history, steps };
    } finally {
      am.dispose();
    }
  }

  /**
   * Acumula simulaciones hasta alcanzar el mínimo de muestras para entrenar.
   */
  public async LearnCicleAgregated(opt?: ICicle3DOptions): Promise<{ history: tf.History; steps: number; reward:number }> {
    const memories: ActionsMemory<tf.Tensor2D, tf.Tensor2D>[] = [];
    let totalSamples = 0;
    try {
      while (totalSamples < MinNumSamples) {
        const memory = new ActionsMemory<tf.Tensor2D, tf.Tensor2D>(5000);
        // Se registra antes de simular para liberarla también si falla un paso.
        memories.push(memory);
        totalSamples += this.collectCicle(memory, opt);
      }

      const batch = memories.flatMap((memory) => memory.getAllSamples());
      const totalReward = memories.reduce((sum, memory) => sum + memory.totalReward, 0);
      const reward = totalReward / totalSamples;
      const history = await this.replayAndTrain(batch);
      return { history, steps: Math.floor(totalSamples / memories.length), reward };
    } finally {
      memories.forEach((memory) => memory.dispose());
    }
  }

  private collectCicle(am: ActionsMemory<tf.Tensor2D, tf.Tensor2D>, opt?: ICicle3DOptions): number {
    const rndExploracion = opt?.explorationF ?? 0.05;
    let isDone = 0;
    let isInside = true;
    let stepCount = 0;

    this.drone.Reset();
    const initial = opt?.initialsPos?.next();
    const values = initial && !initial.done ? initial.value : undefined;
    const pos = values?.pos ?? [Random.gaussianRandom(0, 3), Random.gaussianRandom(6, 5), 0];
    const vel = values?.vel ?? [0, Random.gaussianRandom(0, 2), 0];
    const pitch = values?.pith ?? Random.gaussianRandom(0, 0.5);
    this.drone.Position.set(pos[0], pos[1], pos[2]);
    this.drone.Velocity.set(vel[0], vel[1], vel[2]);
    this.drone.Pitch = pitch;

    while (stepCount < MaxSteps && isInside) {
      const droneState = this.adapter.getStateTensor();
      let prediction: tf.Tensor2D | undefined;
      let stored = false;
      try {
        prediction = this.rnModel.predict(droneState);
        const randomExplore = Math.random() < rndExploracion;
        let info;
        if (randomExplore) {
          const indexF = Random.nexti(0, this.adapter.outputSizes[0]);
          const indexPitch = Random.nexti(this.adapter.outputSizes[0], this.adapter.outputSizes[0] + this.adapter.outputSizes[1]);
          info = this.adapter.setControlData(prediction, indexF, indexPitch);
        } else {
          info = this.adapter.setControlData(prediction);
        }
        if (!prediction || !info) throw new Error('No se pudo obtener una acción para el entrenamiento');
        this.drone.Simulate(this.LapseSegCicle);
        const reward = this.jury.InstanReward(this.drone);
        stepCount++;
        isInside = reward >= this.minReward;
        am.add({ currentState: droneState, action: prediction, reward, info });
        stored = true;
        isDone = this.jury.IsDone(this.drone);
      } finally {
        if (!stored) {
          droneState.dispose();
          prediction?.dispose();
        }
      }
    }
    const lastReward = !isInside ? this.jury.badReward : isDone || 0;
    am.finalize(lastReward);
    return stepCount;
  }

  public async LearnDummy() {
    if(!this.modelDummy) return;
    const nSteps = 200;
    const scale = 1 / nSteps;
    const x0: number[][] = [];
    const y0: number[][] = [];
    for (let i = 0; i < nSteps; i++) {
      const x = i * scale;
      x0.push([x]);
      y0.push([10, 20]);
    }
    const xs = tf.tensor2d(x0, [x0.length, 1]);
    try {
      const ys = tf.tensor2d(y0, [y0.length, 2]);
      try {
        const args: tf.ModelFitArgs = { epochs: 40 };
        const h = await this.modelDummy.fit(xs, ys, args);
        console.log(h);
        for (let i = 0; i < nSteps; i += 10) {
          tf.tidy(() => {
            const tx = tf.tensor2d(x0[i], [1, 1]);
            const data = this.dummyPredict(tx)?.dataSync();
            if (data) console.log(`${i}, [${data[0]}, ${data[1]}]`);
          });
        }
      } finally {
        ys.dispose();
      }
    } finally {
      xs.dispose();
    }
  }

  /**
   * Para un conjunto de valores en un momento  ([posy,vely] o [posx,posy,vel,pith] o ...) predice las recompensas esperadas para cada posible acción
   * @param samples Conjunto de varios valores iniciales (cada valor incluye las distintas variables que alimentan la red)
   * @returns un conjunto con los valores esperados de recompensa para cada accion posible y para cada valor inicial (1 valor es un array de entradas)
   */
  public predictValues(samples: [number, number][]): number[][] {
    return tf.tidy(() => {
      const res: number[][] = [];
      const states = this.adapter.getMappedTensor(samples);
      const r = this.rnModel.predict(states);
      if (r) {
        const tensorData = r.dataSync();
        const nOuts = this.rnModel.outputNumActions;
        for (let i = 0; i < tensorData.length; i += nOuts) {
          res.push(Array.from(tensorData.slice(i, i + nOuts)));
        }
      }
      return res;
    });
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
      this.controlDrone();
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

  /**Simula un ciclo a partir de las condiciones iniciales o hasta que se cumpla alguna de las condiciones */
  public simulateCicleExt(opt:ISimulateCfg): { stepCount: number; lastReward: number; mean: number } {
    this.drone.Reset(); //Partimos de la misma posición...
    this.drone.Position.set(opt.pos[0], opt.pos[1], opt.pos[2]);
    const v0=opt.vel??[0,0,0];
    this.drone.Velocity.set(v0[0], v0[1], v0[2]);
    const maxSteps=opt.maxSteps??MaxSteps;
    const minReward=opt.minReward??-100000;
    let isDone = 0;
    let isInside = true;
    let stepCount = 0;
    let reward = 0;
    const histRewards = [];
    while (stepCount < maxSteps && !isDone && isInside) {
      this.controlDrone();
      this.drone.Simulate(this.LapseSegCicle);
      reward = this.jury.InstanReward(this.drone);
      stepCount++;
      isInside = this.IsInBoundLimits(this.drone);
      isDone = this.jury.IsDone(this.drone);
      histRewards.push(reward);
      if(reward<=minReward) break;
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
    tf.tidy(() => {
      const droneState = this.adapter.getStateTensor();
      const r = this.rnModel.predict(droneState);
      this.adapter.setControlData(r);
    });
  }

  /** Devuelve un objeto con el estado, que permite volver a recrearlo */
  public getSerializedState():ILearnContextSerialized{
    if(!this.NetModel.model) throw new Error("Undefinded net model");
    const model=DroneLearn3DContext.serializeModel(this.NetModel.model);
    const res:ILearnContextSerialized={ modelRN:model};    
    return res;
  }

  /**
   * Carga el estado y pesos de la red neuronal
   * @param state 
   */
  public loadSerializedState(state:unknown){
    if (!DroneLearn3DContext.isSerializedState(state)) throw new Error('Estado de red inválido');
    if(!this.NetModel.model) throw new Error("Undefinded net model");
    DroneLearn3DContext.loadSerializeInModel(this.NetModel.model, state.modelRN);
  }

  public dispose() {
    this.rnModel.dispose();
    this.modelDummy?.dispose();
    this.modelDummy = undefined;
  }

  dummyPredict(states: tf.Tensor | tf.Tensor[]): tf.Tensor2D | undefined {
    if(!this.modelDummy) return undefined;
    return tf.tidy(() => this.modelDummy?.predict(states)) as tf.Tensor2D;
  }

  /** Repite los ultimos datos simulados, guardando los datos obtenidos de la simulación */
  private async replayAndTrain(batch: IActionReplay<tf.Tensor2D, tf.Tensor2D>[]): Promise<tf.History> {
    const x0: number[][] = [];
    const y0: number[][] = [];
    // Balance entre recompensa inmediata y media futura.
    const gamma = 0.7;

    batch.forEach((d) => {
      x0.push(Array.from(d.current.currentState.dataSync()));
      // dataSync puede compartir almacenamiento con el tensor de la muestra.
      const currentQ = Array.from(d.current.action.dataSync());
      const reward = (1 - gamma) * d.current.reward + gamma * d.nextMeanReward;
      const indices = d.current.info.indexActionSelected;
      if (!Array.isArray(indices) || indices.length !== this.adapter.outputSizes.length) {
        throw new Error('Índices de acción inválidos para el entrenamiento 3D');
      }
      let offset = 0;
      indices.forEach((index, group) => {
        const end = offset + this.adapter.outputSizes[group];
        if (!Number.isInteger(index) || index < offset || index >= end || index >= currentQ.length) {
          throw new Error('Índice de acción fuera de su grupo');
        }
        currentQ[index] = reward;
        offset = end;
      });
      y0.push(currentQ);
    });
    const xs = tf.tensor2d(x0, [x0.length, this.rnModel.inputNumStates]);
    try {
      const ys = tf.tensor2d(y0, [y0.length, this.rnModel.outputNumActions]);
      try {
        const args: tf.ModelFitArgs = {
          epochs: 30,
          batchSize: 64,
          callbacks: {
            onEpochEnd: (epoch, log) => {
              if (log && Number.isNaN(log['loss'])) console.warn('Mal asunto');
            }
          }
        };
        return await this.rnModel.train(xs, ys, args);
      } finally {
        ys.dispose();
      }
    } finally {
      xs.dispose();
    }
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

  private static serializeModel(model: tf.LayersModel): IDataModelSerial{
    const ws=model.getWeights(true);
    const res:ITensorFloat[] =[];
    for(const w of ws){
      const data=Float32Array.from(w.dataSync());
      const shape=[...w.shape];
      res.push({data,shape});
    }
    //ws.forEach((w)=>w.dispose());
    return {weights:res};
  }

  private static isSerializedState(state: unknown): state is ILearnContextSerialized {
    if (typeof state !== 'object' || state === null || !('modelRN' in state)) return false;
    const model = state.modelRN;
    if (typeof model !== 'object' || model === null || !('weights' in model) || !Array.isArray(model.weights)) return false;
    return model.weights.every((weight: unknown) => {
      if (typeof weight !== 'object' || weight === null || !('data' in weight) || !('shape' in weight)) return false;
      return ArrayBuffer.isView(weight.data) && Object.prototype.toString.call(weight.data) === '[object Float32Array]'
        && Array.isArray(weight.shape)
        && weight.shape.every((size: unknown) => typeof size === 'number' && Number.isInteger(size) && size >= 0);
    });
  }

  private static loadSerializeInModel(destModel: tf.LayersModel, data:IDataModelSerial ){
    tf.tidy(() => {
      const weights = data.weights.map((weight) => tf.tensor(Float32Array.from(weight.data), weight.shape));
      destModel.setWeights(weights);
    });
  }

}