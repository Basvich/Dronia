
import * as tf from '@tensorflow/tfjs';
import { IDisposable } from '../Objects/utils';


export interface NeuronalDronModel extends IDisposable{
  model:tf.LayersModel | undefined;
  inputNumStates:number;
  outputNumActions:number;
  predict: (states: tf.Tensor | tf.Tensor[]) => tf.Tensor2D | undefined ;
  train:(xBatch: tf.Tensor | tf.Tensor[], yBatch: tf.Tensor | tf.Tensor[], args?:tf.ModelFitArgs) => Promise<tf.History> ;
  
}

// Mirar en https://www.stevefenton.co.uk/blog/2015/12/dynamically-creating-typescript-classes-based-on-type-argument/
/**
 * Modelo para manejar el control del dron unicamente en 1D
 */
export class Model1D implements NeuronalDronModel{
  model: tf.LayersModel | undefined;
  public outputNumActions = 5; //(2 niveles de fuerza por direccion + 0 (g))
  public inputNumStates=2;

  public constructor(){
    this.createModel2();
  }
  

  /** Crea el modelo de red neuronal para manejar 5 salidas como etiquetas */
  public CreateModel(): void {
    if(this.model) return;
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

  /**
   * Crea el modelo de red neuronal para manejar 2 entradas continuas y  5 salidas como etiquetas
   */
  createModel2() {
    if(this.model) return;
    const hiddenLayerSizes = [20, 20];        
    const network = tf.sequential();
    hiddenLayerSizes.forEach((hiddenLayerSize, i) => {
      network.add(tf.layers.dense({
        units: hiddenLayerSize,
        activation: 'relu',
        // `inputShape` is required only for the first layer.
        inputShape: i === 0 ? [this.inputNumStates] : undefined,
        //biasInitializer:tf.initializers.zeros (), //Notar que forzamos una inicialización a 0 para probar
        //kernelInitializer:tf.initializers.zeros ()
      }));
    });
    network.add(tf.layers.dense({ units: this.outputNumActions, 
        //kernelInitializer:tf.initializers.zeros ()
      }));
    network.summary();
    network.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    this.model = network;
  }

  predict(states: tf.Tensor | tf.Tensor[]):tf.Tensor2D | undefined {
    if (!this.model) return undefined;
    return tf.tidy(() => this.model?.predict(states)) as tf.Tensor2D;
  }

  public  train(xBatch: tf.Tensor | tf.Tensor[], yBatch: tf.Tensor | tf.Tensor[], args?:tf.ModelFitArgs):Promise<tf.History>  {
    if(!this.model) throw new Error('missing model');
    return this.model.fit(xBatch, yBatch, args);
  }

  public dispose(){
    if(this.model){
      this.model.dispose();
      this.model=undefined;
    }
  }

  
}

export class Model1D2 implements NeuronalDronModel{
  model: tf.LayersModel | undefined;
  public inputNumStates= 3;
  public outputNumActions= 3;


  public constructor(){
    this.createModel2();
  }


  predict(states: tf.Tensor | tf.Tensor[]):tf.Tensor2D | undefined {
    if (!this.model) return undefined;
    return tf.tidy(() => this.model?.predict(states)) as tf.Tensor2D;
  }

  public  train(xBatch: tf.Tensor | tf.Tensor[], yBatch: tf.Tensor | tf.Tensor[], args?:tf.ModelFitArgs):Promise<tf.History>  {
    if(!this.model) throw new Error('missing model');
    return this.model.fit(xBatch, yBatch, args);
  }

  public dispose(){
    if(this.model){
      this.model.dispose();
      this.model=undefined;
    }
  }
  
  /**
   * Crea el modelo de red neuronal para manejar 2 entradas continuas y  5 salidas como etiquetas
   */
  private createModel2() {
    if(this.model) return;
    const hiddenLayerSizes = [20, 20];        
    const network = tf.sequential();
    hiddenLayerSizes.forEach((hiddenLayerSize, i) => {
      network.add(tf.layers.dense({
        units: hiddenLayerSize,
        activation: 'relu',
        // `inputShape` is required only for the first layer.
        inputShape: i === 0 ? [this.inputNumStates] : undefined,
        //biasInitializer:tf.initializers.zeros (), //Notar que forzamos una inicialización a 0 para probar
        //kernelInitializer:tf.initializers.zeros ()
      }));
    });
    network.add(tf.layers.dense({ units: this.outputNumActions, 
        //kernelInitializer:tf.initializers.zeros ()
      }));
    network.summary();
    network.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    this.model = network;
  }
}


export class ModelDron2D implements NeuronalDronModel{
  model: tf.LayersModel | undefined;
  /** 2 posiciones, 2 velocidad, 2 fuerzas */
  public inputNumStates= 6;
  public outputNumActions= 6; //3 para la fuerza, 3 para el pitch


  public constructor(){
    this.createModel2();
  }


  predict(states: tf.Tensor | tf.Tensor[]):tf.Tensor2D | undefined {
    if (!this.model) return undefined;
    return tf.tidy(() => this.model?.predict(states)) as tf.Tensor2D;
  }

  public  train(xBatch: tf.Tensor | tf.Tensor[], yBatch: tf.Tensor | tf.Tensor[], args?:tf.ModelFitArgs):Promise<tf.History>  {
    if(!this.model) throw new Error('missing model');
    return this.model.fit(xBatch, yBatch, args);
  }

  public dispose(){
    if(this.model){
      this.model.dispose();
      this.model=undefined;
    }
  }
  
  /**
   * Crea el modelo de red neuronal para manejar 2 entradas continuas y  5 salidas como etiquetas
   */
  private createModel2() {
    if(this.model) return;
    const hiddenLayerSizes = [20, 20];        
    const network = tf.sequential();
    hiddenLayerSizes.forEach((hiddenLayerSize, i) => {
      network.add(tf.layers.dense({
        units: hiddenLayerSize,
        activation: 'relu',
        // `inputShape` is required only for the first layer.
        inputShape: i === 0 ? [this.inputNumStates] : undefined,        
      }));
    });
    network.add(tf.layers.dense({ units: this.outputNumActions, 
        //kernelInitializer:tf.initializers.zeros ()
      }));
    network.summary();
    network.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    this.model = network;
  }
}