import * as THREE from 'three';
import { TDrone3D } from '../Objects/Drone3D';
import { ActionsMemory } from './ActionsMemory';
import { IAdapterDroneTf } from './AdapterDroneTf';
import { NeuronalDronModel } from './ModelIA1D';
import { RewardMode, TReward } from './TRewards';
import * as tf from '@tensorflow/tfjs';
import { Random } from '../Objects/utils';

/** El maximo de samples en cada simulación. Evita que se quede en una situación estable infinatemente */
const MaxSteps = 2000;


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
  /**Media de los ultimos datos de premio */
  reward?: number,
  /** Cuantos pasos en el ciclo hubo para simular */
  stepsCount:number
 }

/** Entorno para poder ir realizando el aprendizaje durante varios ciclos */
export class DroneLearnContext {
  /** El tiempo prefijado de cada salto de simulación */
  private readonly LapseSegCicle = 0.1;
  private readonly adapter: IAdapterDroneTf;
  private readonly jury: TReward;
  private modelDummy?: tf.LayersModel;
  private readonly rnModel: NeuronalDronModel;

  public get NetModel() { return this.rnModel; }

  /** Limites de la escena actual por donde se mueve el drone */
  sceneLimits = new THREE.Box3(new THREE.Vector3(-20, -20, -20), new THREE.Vector3(20, 20, 20));
  /** Minima recompensa que nos saca */
  minReward = -20;

  public set targetY(v: number) {
    this.adapter.targetY = v;
    this.jury.targetY = v;
  }

  public constructor(private drone: TDrone3D, factoryRN: () => NeuronalDronModel, factoryAdapter: () => IAdapterDroneTf, rewardMode: RewardMode = 'original') {
    this.rnModel = factoryRN();
    this.adapter = factoryAdapter();
    this.jury = new TReward(rewardMode);
  }

  public async LearnCicle(opt?: ICicleOptions) {
    const am: ActionsMemory<tf.Tensor2D, tf.Tensor2D> = new ActionsMemory<tf.Tensor2D, tf.Tensor2D>(5000);
    const rndExploracion = opt?.explorationF ?? 0.05; //por defecto Un 5% de escoger una ruta aleatoria
    let isDone = 0;
    let isInside = true;
    let stepCount = 0;

    this.drone.Reset(); //Partimos de la misma posición...
    this.jury.reset();
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

    try {
      while (stepCount < MaxSteps && isInside) {
        const droneState = this.adapter.getStateTensor();
        let prediction: tf.Tensor2D | undefined;
        let stored = false;
        try {
          prediction = this.rnModel.predict(droneState);
          let forcedI: number | undefined;
          if (Math.random() < rndExploracion) {
            forcedI = Math.floor(Math.random() * this.rnModel.outputNumActions);
          }
          const info = this.adapter.setControlData(prediction, forcedI);
          if (!prediction || !info) {
            throw new Error('No se pudo obtener una acción para el entrenamiento');
          }
          this.drone.Simulate(this.LapseSegCicle);

          const reward = this.jury.InstanReward(this.drone, this.LapseSegCicle);
          if (stepCount % 100 === 0 || forcedI !== undefined || stepCount + 1 === MaxSteps) {
            console.log(`${stepCount} -> pos:[${this.drone.Position.y}] vel:[${this.drone.Velocity.y}] rew:${reward}  force:${this.adapter.TotalRelativeForce(info.indexActionSelected)}  ${forcedI !== undefined ? 'RND' : ''}`);
          }
          stepCount++;
          // Mantiene el criterio de fin original aunque cambie la escala de recompensa.
          const reference = this.jury.mode === 'original' ? reward : this.jury.referenceReward(this.drone);
          isInside = reference >= this.minReward;
          am.add({ currentState: droneState, action: prediction, reward, info });
          // La memoria pasa a ser responsable de ambos tensores.
          stored = true;
          isDone = this.jury.IsDone(this.drone);
        } finally {
          if (!stored) {
            droneState.dispose();
            prediction?.dispose();
          }
        }
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
    } finally {
      am.dispose();
    }
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
    const xs = tf.tensor2d(x0, [x0.length, 1]);
    try {
      const ys = tf.tensor2d(y0, [y0.length, 2]);
      try {
        const args: tf.ModelFitArgs = { epochs: 40 };
        const h = await this.getDummyModel().fit(xs, ys, args);
        console.log(h);
        for (let i = 0; i < nSteps; i += 10) {
          tf.tidy(() => {
            const tx = tf.tensor2d(x0[i], [1, 1]);
            const data = this.dummyPredict(tx)?.dataSync();
            if (data) {
              console.log(`${i}, [${data[0]}, ${data[1]}]`);
            }
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

  /**
   * Parte de una posición indicada, y lo simula hasta que se sale
   * @param posY 
   * @param velY 
   * @returns 
   */
  public simulateCicle(posY: number, velY: number): { stepCount: number; lastReward: number; mean: number } {
    this.drone.Reset(); //Partimos de la misma posición...
    this.jury.reset();
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
      reward = this.jury.InstanReward(this.drone, this.LapseSegCicle);
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
    tf.tidy(() => {
      const droneState = this.adapter.getStateTensor();
      const r = this.rnModel.predict(droneState);
      this.adapter.setControlData(r);
    });
  }

  public Dispose() {
    this.rnModel.dispose();
    this.modelDummy?.dispose();
    this.modelDummy = undefined;
  }

  dummyPredict(states: tf.Tensor | tf.Tensor[]): tf.Tensor2D | undefined {
    return tf.tidy(() => this.getDummyModel().predict(states)) as tf.Tensor2D;
  }

  /** Repite los ultimos datos simulados, guardando los datos obtenidos de la simulación */
  private async replayAndTrain(am: ActionsMemory<tf.Tensor2D, tf.Tensor2D>) {
    const batch = am.getAllSamples();
    const x0: number[][] = [];
    const y0: number[][] = [];
    let lastx0: number[] = [];
    let lasty0: number[] = [];
    /**Balanceo sobre la importancia de valor futuros o solo el actual ([0,1] mas alto mayor futuro) */
    const gamma = 0.7;

    batch.forEach((d) => {
      const staten = Array.from(d.current.currentState.dataSync());
      x0.push(staten);
      lastx0 = staten;
      // Copiamos la predicción: dataSync puede compartir la memoria del tensor.
      const currentQ = Array.from(d.current.action.dataSync());
      const indexOfAction = d.current.info.indexActionSelected;
      if (typeof indexOfAction !== 'number' || !Number.isInteger(indexOfAction) || indexOfAction < 0 || indexOfAction >= currentQ.length) {
        throw new Error('Índice de acción inválido para el entrenamiento 1D');
      }
      const reward = (1 - gamma) * d.current.reward + gamma * d.nextMeanReward;
      currentQ[indexOfAction] = reward;
      lasty0 = currentQ;
      y0.push(lasty0);
    });
    const xs = tf.tensor2d(x0, [x0.length, this.rnModel.inputNumStates]);
    try {
      const ys = tf.tensor2d(y0, [y0.length, this.rnModel.outputNumActions]);
      try {
        const printCallback = {
          onEpochEnd: (epoch: number, log: unknown) => {
            console.log(epoch, log);
          },
        };
        const args: tf.ModelFitArgs = { epochs: 30, batchSize: 64, callbacks: printCallback };
        const h = await this.rnModel.train(xs, ys, args);
        console.log(h);
        tf.tidy(() => {
          const tLastX0 = tf.tensor2d([lastx0]);
          const predicted = this.rnModel.predict(tLastX0)?.dataSync();
          console.log('ultimo y0', lasty0);
          console.log('prediccion', predicted);
        });
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


  private getDummyModel(): tf.LayersModel {
    this.modelDummy ??= this.createDummyModel();
    return this.modelDummy;
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

