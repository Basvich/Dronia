import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';
import { vi } from 'vitest';
import { TDrone3D } from '../Objects/Drone3D';
import { AdapterDrone2D } from './AdapterDroneTf';
import { DroneLearn3DContext } from './DroneLearn3DContext';
import { ModelDron2D, NeuronalDronModel } from './ModelIA1D';
import { TReward3D } from './TRewards';

describe('DroneLearn3DContext', () => {
  let drone: TDrone3D;
  let model: NeuronalDronModel;
  let context: DroneLearn3DContext;
  let initialTensors: number;

  beforeEach(() => {
    initialTensors = tf.memory().numTensors;
    drone = new TDrone3D(0, 0);
    model = {
      model: undefined,
      inputNumStates: 6,
      outputNumActions: 6,
      predict: vi.fn(() => tf.tensor2d([[1, 2, 3, 4, 5, 6]])),
      train: vi.fn(),
      dispose: vi.fn()
    };
    context = new DroneLearn3DContext(drone, () => model, () => new AdapterDrone2D(drone));
  });

  afterEach(() => {
    context.dispose();
    vi.restoreAllMocks();
    expect(tf.memory().numTensors).toBe(initialTensors);
  });

  it('respeta el pitch inicial cero y actualiza ambos grupos de acciones', async () => {
    vi.spyOn(TReward3D.prototype, 'InstanReward').mockReturnValue(2);
    vi.spyOn(TReward3D.prototype, 'IsDone').mockReturnValue(0);
    const pitch = vi.spyOn(drone, 'Pitch', 'set');
    context.minReward = 3;
    let prediction: tf.Tensor2D | undefined;
    vi.mocked(model.predict).mockImplementation(() => {
      prediction = tf.tensor2d([[1, 2, 3, 4, 5, 6]]);
      return prediction;
    });
    vi.mocked(model.train).mockImplementation((xs, ys) => {
      expect((xs as tf.Tensor).shape).toEqual([1, 6]);
      expect(Array.from((ys as tf.Tensor).dataSync())).toEqual([1, 2, -18, 4, 5, -18]);
      expect(prediction && Array.from(prediction.dataSync())).toEqual([1, 2, 3, 4, 5, 6]);
      return Promise.resolve({} as tf.History);
    });

    const positions: Array<{ pos: [number, number, number]; vel: [number, number, number]; pith: number }> = [{
      pos: [0, 6, 0], vel: [0, 0, 0], pith: 0
    }];
    const result = await context.LearnCicle({
      explorationF: 0,
      initialsPos: positions[Symbol.iterator]()
    });
    expect(pitch).toHaveBeenCalledWith(0);
    expect(result.steps).toBe(1);
  });

  it('libera las muestras y lotes cuando falla el entrenamiento agregado', async () => {
    vi.spyOn(TReward3D.prototype, 'InstanReward').mockReturnValue(2);
    vi.spyOn(TReward3D.prototype, 'IsDone').mockReturnValue(0);
    context.minReward = 3;
    vi.mocked(model.train).mockRejectedValue(new Error('fallo de entrenamiento'));

    await expect(context.LearnCicleAgregated({ explorationF: 0 })).rejects.toThrow('fallo de entrenamiento');
  });

  it('conserva los totales y el tamaño de los lotes del entrenamiento agregado', async () => {
    vi.spyOn(TReward3D.prototype, 'InstanReward').mockReturnValue(2);
    vi.spyOn(TReward3D.prototype, 'IsDone').mockReturnValue(0);
    context.minReward = 3;
    vi.mocked(model.train).mockImplementation((xs, ys, args) => {
      expect((xs as tf.Tensor).shape).toEqual([1000, 6]);
      expect((ys as tf.Tensor).shape).toEqual([1000, 6]);
      expect(args?.epochs).toBe(30);
      return Promise.resolve({} as tf.History);
    });

    const result = await context.LearnCicleAgregated({ explorationF: 0 });
    expect(result.steps).toBe(1);
    expect(result.reward).toBe(-18);
  });

  it('libera las muestras acumuladas si deja de haber una predicción', async () => {
    vi.spyOn(TReward3D.prototype, 'InstanReward').mockReturnValue(2);
    vi.spyOn(TReward3D.prototype, 'IsDone').mockReturnValue(0);
    vi.mocked(model.predict)
      .mockImplementationOnce(() => tf.tensor2d([[1, 2, 3, 4, 5, 6]]))
      .mockReturnValueOnce(undefined);

    await expect(context.LearnCicleAgregated()).rejects.toThrow('No se pudo obtener una acción');
  });

  it('usa el mismo objetivo para control y recompensa', () => {
    const target = new THREE.Vector3(2, 8, 0);
    const reward = vi.spyOn(TReward3D.prototype, 'InstanReward');
    let input: number[] = [];
    vi.mocked(model.predict).mockImplementation((states) => {
      if (states instanceof tf.Tensor) input = Array.from(states.dataSync());
      return tf.tensor2d([[1, 2, 3, 4, 5, 6]]);
    });
    context.targetPos = target;
    vi.spyOn(drone, 'Simulate').mockImplementation(() => undefined);
    context.simulateCicleExt({ pos: [2, 8, 0], maxSteps: 1 });
    expect(reward).toHaveReturnedWith(10);
    expect(input.slice(0, 2)).toEqual([0, 0]);
  });

  it('copia los pesos serializados y libera los tensores temporales al cargarlos', () => {
    context.dispose();
    model = new ModelDron2D();
    context = new DroneLearn3DContext(drone, () => model, () => new AdapterDrone2D(drone));
    const before = tf.memory().numTensors;
    const state = context.getSerializedState();
    const saved = state.modelRN.weights[0].data[0];
    context.loadSerializedState(state);
    expect(tf.memory().numTensors).toBe(before);
    expect(() => context.loadSerializedState({
      modelRN: { weights: [{ data: new Float32Array([1]), shape: [1] }] }
    })).toThrow();
    expect(tf.memory().numTensors).toBe(before);
    state.modelRN.weights[0].data[0] = saved + 1;
    expect(context.getSerializedState().modelRN.weights[0].data[0]).toBe(saved);
  });

  it('entrena un modelo real y libera sus recursos', async () => {
    context.dispose();
    model = new ModelDron2D();
    context = new DroneLearn3DContext(drone, () => model, () => new AdapterDrone2D(drone));
    vi.spyOn(TReward3D.prototype, 'InstanReward').mockReturnValue(2);
    vi.spyOn(TReward3D.prototype, 'IsDone').mockReturnValue(0);
    context.minReward = 3;
    const result = await context.LearnCicle({ explorationF: 0 });
    expect(result.steps).toBe(1);
    expect(result.history.history['loss']).toHaveLength(30);
  });
});
