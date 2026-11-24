import * as tf from '@tensorflow/tfjs';
import { vi } from 'vitest';
import { TDrone3D } from '../Objects/Drone3D';
import AdapterDroneTf from './AdapterDroneTf';
import { DroneLearnContext } from './DroneLearnContext';
import { NeuronalDronModel } from './ModelIA1D';
import { TReward } from './TRewards';

describe('DroneLearnContext', () => {
  let drone: TDrone3D;
  let model: NeuronalDronModel;
  let context: DroneLearnContext;
  let initialTensors: number;

  beforeEach(() => {
    initialTensors = tf.memory().numTensors;
    drone = new TDrone3D(0, 0);
    model = {
      model: undefined,
      inputNumStates: 2,
      outputNumActions: 3,
      predict: vi.fn(() => tf.tensor2d([[7, 8, 9]])),
      train: vi.fn(),
      dispose: vi.fn()
    };
    context = new DroneLearnContext(drone, () => model, () => new AdapterDroneTf(drone));
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    context.Dispose();
    vi.restoreAllMocks();
    expect(tf.memory().numTensors).toBe(initialTensors);
  });

  it('entrena con la recompensa final sin modificar la predicción almacenada', async () => {
    vi.spyOn(TReward.prototype, 'InstanReward').mockReturnValue(2);
    vi.spyOn(TReward.prototype, 'IsDone').mockReturnValue(0);
    context.minReward = 3;
    let prediction: tf.Tensor2D | undefined;
    vi.mocked(model.predict).mockImplementation(() => {
      prediction = tf.tensor2d([[7, 8, 9]]);
      return prediction;
    });
    vi.mocked(model.train).mockImplementation((xs, ys, args) => {
      expect((xs as tf.Tensor2D).shape).toEqual([1, 2]);
      expect(Array.from((ys as tf.Tensor2D).dataSync())).toEqual([7, 8, -18]);
      expect(prediction && Array.from(prediction.dataSync())).toEqual([7, 8, 9]);
      expect(args?.epochs).toBe(30);
      expect(args?.batchSize).toBe(64);
      return Promise.resolve({} as tf.History);
    });

    await context.LearnCicle({
      explorationF: 0,
      initialsPos: [{ posY: 0, velY: 0 }][Symbol.iterator]()
    });

    expect(model.train).toHaveBeenCalledOnce();
  });

  it('libera las muestras y los lotes si falla el entrenamiento', async () => {
    vi.spyOn(TReward.prototype, 'InstanReward').mockReturnValue(2);
    vi.spyOn(TReward.prototype, 'IsDone').mockReturnValue(0);
    context.minReward = 3;
    vi.mocked(model.train).mockRejectedValue(new Error('fallo de entrenamiento'));

    await expect(context.LearnCicle({ explorationF: 0 })).rejects.toThrow('fallo de entrenamiento');
  });

  it('libera el estado si falla la predicción durante el control o el aprendizaje', async () => {
    vi.mocked(model.predict).mockImplementation(() => {
      throw new Error('fallo de predicción');
    });

    expect(() => context.controlDrone()).toThrow('fallo de predicción');
    await expect(context.LearnCicle()).rejects.toThrow('fallo de predicción');
  });

  it('informa si el modelo no produce una acción', async () => {
    vi.mocked(model.predict).mockReturnValue(undefined);

    await expect(context.LearnCicle()).rejects.toThrow('No se pudo obtener una acción');
    expect(model.train).not.toHaveBeenCalled();
  });

  it('libera las muestras anteriores si falla un paso posterior', async () => {
    vi.spyOn(TReward.prototype, 'InstanReward').mockReturnValue(2);
    vi.spyOn(TReward.prototype, 'IsDone').mockReturnValue(0);
    vi.mocked(model.predict)
      .mockImplementationOnce(() => tf.tensor2d([[7, 8, 9]]))
      .mockImplementationOnce(() => { throw new Error('fallo en el segundo paso'); });

    await expect(context.LearnCicle({ explorationF: 0 })).rejects.toThrow('fallo en el segundo paso');
  });

  it('agrupa las predicciones y libera los tensores de la consulta', () => {
    vi.mocked(model.predict).mockImplementation(() => tf.tensor2d([[1, 2, 3], [4, 5, 6]]));

    expect(context.predictValues([[0, 1], [2, 3]])).toEqual([[1, 2, 3], [4, 5, 6]]);
  });

  it('mantiene la recompensa final y la media de los últimos 100 pasos', () => {
    let step = 0;
    vi.spyOn(drone, 'Simulate').mockImplementation(() => undefined);
    vi.spyOn(TReward.prototype, 'InstanReward').mockImplementation(() => ++step);
    vi.spyOn(TReward.prototype, 'IsDone').mockImplementation(() => step === 105 ? 5 : 0);

    expect(context.simulateCicle(0, 0)).toEqual({ stepCount: 105, lastReward: 110, mean: 55.55 });
  });

  it('crea el modelo de prueba solo al usarlo y lo libera al cerrar el contexto', () => {
    expect(tf.memory().numTensors).toBe(initialTensors);
    tf.tidy(() => {
      const input = tf.tensor2d([[1]]);
      expect(context.dummyPredict(input)?.shape).toEqual([1, 2]);
      expect(context.dummyPredict(input)?.shape).toEqual([1, 2]);
    });
  });

  it('libera los tensores de la prueba de entrenamiento', async () => {
    await context.LearnDummy();
  });
});
