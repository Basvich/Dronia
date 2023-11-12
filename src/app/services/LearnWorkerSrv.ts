import { Injectable } from "@angular/core";
import { IStudentState, Student } from "../NetsIA/Students";
import { Notification, Observable, ObservableNotification, Observer, Subject, Subscriber, Subscription, dematerialize, map, materialize, tap, zip } from "rxjs";


export enum SatusWorking{
  none, working, finished
}

export interface ResultWorking<T>{
  value:T,
  status:SatusWorking,
  nfo?:{
    count:number,
    pending:number
  }
}



@Injectable({
  providedIn: 'root'
})
export class LearnWorkerService {
  private workersRunning=0;

  // eslint-disable-next-line class-methods-use-this
  public CicleLearnStudents(students: Student[]): Observable<Student> {
    const subject = new Subject<Student>();
    const pending = [...students];
    if (typeof Worker === 'undefined') throw new Error("Not workers available");
    const worker = new Worker(new URL('../workers/learn.worker', import.meta.url));
    pending.forEach((s) => { worker.postMessage(s.getSerializedState()); });
    worker.onmessage = ({ data }) => {
      this.onWorkEnd(pending, subject, data);
    };
    return subject.asObservable();
  }

  //Mirar ejemplo en https://github.com/cloudnc/observable-webworker/blob/master/projects/observable-webworker/src/lib/from-worker.ts

  public CicleLearnStudents2(input$: Observable<Student>): Observable<Student> {
    return new Observable((responseObserver: Observer<ObservableNotification<Student>>) => {
      let worker: Worker;
      let subscription: Subscription;
      try {
        worker = new Worker(new URL('../workers/learn.worker', import.meta.url));
        worker.onmessage = (ev) => responseObserver.next(ev.data);
        worker.onerror = (ev: ErrorEvent) => responseObserver.error(ev);
        subscription = input$.pipe(
          materialize(),
          tap((input) => {
            if (input.kind === "N") {
              const d = input.value.getSerializedState();
              worker.postMessage(d);
            }
          }),
        ).subscribe();
      } catch (error) {
        responseObserver.error(error);
      }
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
        if (worker) {
          worker.terminate();
        }
      };
    }).pipe(
      //map(({ kind, value, error }) => {return {kind, value, error};}),
      dematerialize(),
    );
  }

  public CicleLeanrStudents3(input$: Observable<Student>): Observable<ResultWorking<Student>>{
    const limitedWorkers=new LimitedWorkers<LearnWorkerProxy>(LearnWorkerProxy);
    let c=0;
    let pending=0;
    let closedZipped=false;   
    let clientSubscriber: Subscriber<ResultWorking<Student>> | undefined=undefined;
    const res$=new Observable<ResultWorking<Student>>((subscriber)=>{
      clientSubscriber=subscriber;
      const zipped=zip(limitedWorkers.LimitedConcurrent(), input$);
    zipped.subscribe({
      next(value: [LearnWorkerProxy, Student]){        
        c++;
        pending++;
        console.log(`[LearnWorkerService] zipped.next -> "${value[1].name}" ${value[1].statusStr} c: ${c} pending: ${pending}`);
        if(clientSubscriber && !clientSubscriber.closed){
          clientSubscriber.next({value:value[1], status:SatusWorking.working, nfo:{count:c, pending}});
        } else console.log('No clientSubscriber');
        value[0].DoWork(value[1]).then((res)=>{
          pending--;
          if(clientSubscriber){
            if(!clientSubscriber.closed){
              clientSubscriber.next({value:res, status:SatusWorking.finished, nfo:{count:c, pending}});
            }
          }          
          limitedWorkers.FreeOne();
          if(pending<=0){
            if(clientSubscriber){
              clientSubscriber.complete();
              clientSubscriber=undefined;
            }
          }
        }).catch( (err)=>{
          if(clientSubscriber){
            console.error(err);
            clientSubscriber.error(err);            
            clientSubscriber.complete();
          }
          console.log(err);
        });
      },
      complete(){
        console.log(`Zipped complete c:${c}`);
        closedZipped=true;
        /* if(clientSubscriber){
          clientSubscriber.complete();
          clientSubscriber=undefined;
        } */
      },
      error(msg){
        console.log('Error',msg);
      }
    });
    });
    
    return res$;
  }
 

  private onWorkEnd(pending: Student[], subject: Subject<Student>, data: IStudentState) {
    const i = pending.findIndex((v) => { return v.name === data.name; });
    if (i >= 0) {
      const st = pending[i];
      pending.splice(i, 1);
      st.loadSerializedState(data);
      if (!subject.closed) subject.next(st);
    }
    if (pending.length === 0 && !subject.closed) subject.complete();
  }  
}

export interface IWorkerStudent extends Object{
  DoWork(student: Student):Promise<Student>;
}

/** Wraper entorno al web worker, para convertir una petición de trabajo del worker
 * en una promesa. Se usa serialización de estados  y paso de mensajes
 */
class LearnWorkerProxy implements IWorkerStudent{
  private worker? :Worker;
  public DoWork(student: Student):Promise<Student>{
    return new Promise((resolve, reject)=>{
      try{
        if(!this.worker){
          this.worker = new Worker(new URL('../workers/learn.worker', import.meta.url));
          this.worker.onerror=(err)=>reject(err);
          this.worker.onmessage=(event)=>{
            student.loadSerializedState(event.data);
            resolve(student);
            this.terminate();
          };
          const d = student.getSerializedState();
          this.worker.postMessage(d);
        }        
      }catch(error){
        reject(error);
        this.terminate();
      }
    });
  }
  public terminate(){
    if(this.worker) this.worker.terminate();
    this.worker=undefined;
    if(this.onEnd) this.onEnd(this);
  }
  onEnd?:(sender:LearnWorkerProxy)=>void;
}

/** Sirve para ir proporcionando observables con un maximo de simultaneos.
 * Sirve para limitar el número máximo de tareas simultáneas
 */
export  class LimitedWorkers<T extends IWorkerStudent>{
  private currentWorkers:Array<T> =[];
  private disponibleWorkers=3;
  private subscriber?: Subscriber<T>;

  constructor (private fact: { new (): T }){

  }

  public LimitedConcurrent(max?:number ): Observable<T> {
    if(max) this.disponibleWorkers=max;
    return new Observable((subscriber)=>{
      this.subscriber=subscriber;
      this.publishAllDisponibles();      
    });
  }

  private publishAllDisponibles(){
    while(this.subscriber && this.disponibleWorkers>0 && !this.subscriber.closed){
      this.disponibleWorkers-=1;
      const nWorker= this.create(this.fact);//this.fact();//new LearnWorkerProxy();
      //const aaa=this.create(LearnWorkerProxy);
      this.subscriber.next(nWorker);        
    }  
  }

  /** Mantengo esto como referencia para usar como ejemplo de una función que pasandole un tipo, llamaría al constructor*/
  private create<T>(c: { new (): T }): T {
    return new c();
  }

  public FreeOne(){
    if(this.subscriber){
      if(!this.subscriber.closed){
        this.disponibleWorkers+=1;
        this.publishAllDisponibles();
      }else{
        this.subscriber.complete();
        this.subscriber=undefined;
      }
    }
  }
}


/**
 * Simple prototipo para probar el concepto de un observable capaz de limitar cierto numero de
 * items simultaneos
 */
export class TestLimitedWorkers{
  private disponibleWorkers=3;
  private subscriber?: Subscriber<number>;
  private c=1;

  public LimitedConcurrent(): Observable<number> {
    return new Observable((subscriber)=>{
      this.subscriber=subscriber;
      this.publishAllDisponibles();
    });
  }
  
  public FreeOne(){
    if(this.subscriber){
      if(!this.subscriber.closed){
        this.disponibleWorkers+=1;
        this.publishAllDisponibles();
      }else{
        this.subscriber.complete();
        this.subscriber=undefined;
      }
    }
  }

  private publishAllDisponibles(){
    while(this.subscriber && this.disponibleWorkers>0 && !this.subscriber.closed){
      this.disponibleWorkers-=1;
      this.subscriber.next(this.c++);        
    }
  }
}



