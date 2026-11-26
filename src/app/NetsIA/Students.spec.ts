import * as tf from '@tensorflow/tfjs';
import { Student, StudentStatus } from './Students';

describe('Student', () => {
  it('conserva el estado al serializarlo y cargarlo', () => {
    const before = tf.memory().numTensors;
    const source = new Student();
    const destination = new Student();
    try {
      source.name = 'Dron';
      source.learnCicles = 7;
      source.score = 3;
      source.status = StudentStatus.study;
      expect(source.statusStr).toBe('study');
      const state = structuredClone(source.getSerializedState());
      destination.loadSerializedState(state);
      const restored = destination.getSerializedState();
      expect([restored.id, restored.name, restored.learnCicles, restored.score, restored.reward, restored.loss])
        .toEqual([state.id, state.name, state.learnCicles, state.score, state.reward, state.loss]);
      restored.context.modelRN.weights.forEach((weight, i) => {
        expect(Array.from(weight.shape)).toEqual(Array.from(state.context.modelRN.weights[i].shape));
        expect(Array.from(weight.data)).toEqual(Array.from(state.context.modelRN.weights[i].data));
      });
      expect(() => destination.loadSerializedState({ ...state, name: null })).toThrow('Estado de alumno inválido');
      expect(() => destination.loadSerializedState({ ...state, name: 'Otro', context: {} })).toThrow('Estado de red inválido');
      expect(destination.name).toBe('Dron');
    } finally {
      source.dispose();
      destination.dispose();
    }
    expect(tf.memory().numTensors).toBe(before);
  });
});
