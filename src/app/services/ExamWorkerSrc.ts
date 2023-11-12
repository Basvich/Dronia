import { Injectable } from "@angular/core";
import { Observable, Subject, Subscriber, zip } from "rxjs";
import { IStudentState, Student } from "../NetsIA/Students";
import { IWorkerStudent, LimitedWorkers, ResultWorking, SatusWorking } from "./LearnWorkerSrv";





@Injectable({
  providedIn: 'root'
})
export class ExamWorkerService {  
  public CicleExamineStudents(input$: Observable<Student>): Observable<ResultWorking<Student>>{
    const limitedWorkers=new LimitedWorkers<ExamineWorkerProxy>(ExamineWorkerProxy);
    let c=0;
    let pending=0;
    let closedZipped=false;
    const zipped=zip(limitedWorkers.LimitedConcurrent(), input$);
    let clientSubscriber: Subscriber<ResultWorking<Student>> | undefined=undefined;
    const res$=new Observable<ResultWorking<Student>>((subscriber)=>{
      clientSubscriber=subscriber;
    });
    zipped.subscribe({
      next(value){
        c++;
        pending++;
        if(clientSubscriber && !clientSubscriber.closed){
          clientSubscriber?.next({value:value[1], status:SatusWorking.working});
        }
        value[0].DoWork(value[1]).then((res)=>{
          pending--;
          if(clientSubscriber){
            if(!clientSubscriber.closed){
              clientSubscriber.next({value:res, status:SatusWorking.finished});
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

class ExamineWorkerProxy implements IWorkerStudent{
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
