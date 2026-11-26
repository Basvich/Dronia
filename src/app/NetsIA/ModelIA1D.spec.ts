import * as tf from '@tensorflow/tfjs';
import { vi } from 'vitest';
import { ModelDron2D } from './ModelIA1D';

describe('ModelDron2D', () => {
  it('rechaza una predicción de rango incorrecto sin perder tensores', () => {
    const before = tf.memory().numTensors;
    const model = new ModelDron2D();
    try {
      if (!model.model) throw new Error('Falta el modelo');
      vi.spyOn(model.model, 'predict').mockImplementation(() => tf.tensor1d([1]));
      tf.tidy(() => {
        const states = tf.tensor2d([[0, 0, 0, 0, 0, 0]]);
        expect(() => model.predict(states)).toThrow('rango 2');
      });
    } finally {
      model.dispose();
      vi.restoreAllMocks();
    }
    expect(tf.memory().numTensors).toBe(before);
  });
});
