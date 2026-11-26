import * as tf from '@tensorflow/tfjs';
import { TDrone3D } from '../Objects/Drone3D';
import AdapterDroneTf, { AdapterDroneTf2 } from './AdapterDroneTf';
import { Model1D2 } from './ModelIA1D';

describe('Adaptadores 1D', () => {
  it('selecciona la mejor acción aunque todos los valores sean menores que -1000', () => {
    const drone = new TDrone3D(0, 0);
    const adapter = new AdapterDroneTf(drone);
    tf.tidy(() => {
      const prediction = tf.tensor2d([[-2000, -1500, -1200, -1800, -1600]]);
      expect(adapter.setControlData(prediction)?.indexActionSelected).toBe(2);
      expect(drone.TotalForce).toBe(drone.FuerzaNeutra);
    });
  });

  it('incluye la fuerza actual en los estados de la gráfica del modelo de tres entradas', () => {
    const drone = new TDrone3D(0, 0);
    const adapter = new AdapterDroneTf2(drone);
    const model = new Model1D2();
    try {
      tf.tidy(() => {
        const states = adapter.getMappedTensor([[6, 0], [8, 1]]);
        expect(states.shape).toEqual([2, 3]);
        expect(states.arraySync()).toEqual([[0, 0, drone.NetForce.y], [2, 1, drone.NetForce.y]]);
        expect(model.predict(states)?.shape).toEqual([2, 3]);
      });
    } finally {
      model.dispose();
    }
  });
});
