
import * as tf from '@tensorflow/tfjs';

/**
 * Modelo para manejar el control del dron ´ñunicamente en 1D
 */
export class Model1D {
  model: tf.LayersModel | undefined;

  public CreateModel(): void {
    const model = tf.sequential();
    //Entradas
    model.add(tf.layers.dense({
      inputShape: [1],  //una entrada 1d, con 1 parametro; N-D tensor with shape
      units: 20,  //20 salidas, o una primera capa de 20 neuronas ; Positive integer, dimensionality of the output space.
      activation: 'relu',
    }));
    //intermedia
    model.add(
      tf.layers.dense({
        units: 20,
        activation: 'relu', //Ver disponibles en https://tech.courses/plotting-tensorflow-js-activation-functions/
      })
    );
    model.add(
      tf.layers.dense({
        units: 5,
        activation: 'relu', //Ver disponibles en https://tech.courses/plotting-tensorflow-js-activation-functions/
      })
    );
    //Salida
    model.add(
      tf.layers.dense({
        units: 1,
      })
    );
    // Compile for training
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
    });
    this.model = model;
    this.model.summary();
  }

  createModel2() {
    const hiddenLayerSizes = [5, 10];
    const inputNumStates = 2;
    const outputNumActions = 5; //(2 niveles de fuerza por direccion + 0 (g))
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
    this.model = network;
  }

  predict(states: tf.Tensor | tf.Tensor[]):tf.Tensor2D | undefined {
    if (!this.model) return undefined;
    return tf.tidy(() => this.model?.predict(states)) as tf.Tensor2D;
  }
}