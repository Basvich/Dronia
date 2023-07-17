import { Pipe, PipeTransform } from "@angular/core";
import { TDrone3D } from "../Objects/Drone3D";
import { IDisposable, ISerializable } from "../Objects/utils";
import { AdapterDrone2D } from "./AdapterDroneTf";
import { DroneLearn3DContext, ILearnContextSerialized } from "./DroneLearn3DContext";
import { ModelDron2D } from "./ModelIA1D";

export interface IStudentState{
  name:string;
  learnCicles:number;
  score:number;
  /** básicamente los resultados de reward del aprendizaje */
  reward:number;
  /** La media de los loss de aprendizaje de la red */
  loss:number;
  context:ILearnContextSerialized;
}

export enum StudentStatus{
  none=0, enqueue, study, exam
}

export class Student  implements ISerializable,IDisposable {  
  drone: TDrone3D;
  learnContext?: DroneLearn3DContext ;
  public name="None";
  /** básicamente los resultados de reward del aprendizaje */
  public reward=0;
  public loss=0;
  /** puntos en pruebas de examen */
  public score=0;
  /** Simple cuenta del total de ciclos de aprendizaje realizados */
  public learnCicles=0;
  public status:StudentStatus=StudentStatus.none;
  public get statusStr(){
     return new EnumIntToDescriptionPipe().transform(this.status, StudentStatus);
    }

  constructor(){
    this.drone=new TDrone3D(0,0,0);
    const createAdapter= () => {
      if(!this.drone) throw new Error('Undefined drone');
      return new AdapterDrone2D(this.drone);
    };    
    this.learnContext=new DroneLearn3DContext(this.drone, () => { return new ModelDron2D(); }, createAdapter);
  }
  

  getSerializedState():IStudentState{
    if(!this.learnContext) throw new Error('missing learn context');
    const res:IStudentState={
      name: this.name,
      score:this.score,
      reward:this.reward,
      loss:this.loss,
      learnCicles:this.learnCicles, 
      context: this.learnContext.getSerializedState()
    };
    return res;
  }

  loadSerializedState(state: unknown){
    if(!this.learnContext) throw new Error('missing learn context');    
    const st=state as IStudentState;
    this.score=st.score;
    this.reward=st.reward;
    this.loss=st.loss;
    this.name=st.name;   
    this.learnCicles=st.learnCicles; 
    this.learnContext.loadSerializedState(st.context);
  }

  dispose(){
    if(this.learnContext){
      this.learnContext.dispose();
    }
  }
}

@Pipe({
  name: 'enumIntToDescription',
})
export class EnumIntToDescriptionPipe implements PipeTransform {
  // enum object on which you want this pipe to work
  // eslint-disable-next-line class-methods-use-this
  transform(value: number, eenum: any): any {
      return Object.values(eenum)[value];
  }
}