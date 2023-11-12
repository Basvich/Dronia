import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatStepper } from '@angular/material/stepper';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import {STEPPER_GLOBAL_OPTIONS} from '@angular/cdk/stepper';
import GUI from 'lil-gui';
import { from, take, tap } from 'rxjs';
import { Student,EnumIntToDescriptionPipe, StudentStatus } from 'src/app/NetsIA/Students';
import { Random } from 'src/app/Objects/utils';
import { HelloWorkerService } from 'src/app/services/HelloWorkerSrv';
import { LearnWorkerService, SatusWorking, TestLimitedWorkers } from 'src/app/services/LearnWorkerSrv';
import { DbService } from 'src/app/services/db.service';
import { ThreeRenderComponent } from 'src/app/three-render/three-render.component';


@Component({
  selector: 'app-drone2d-genetic',
  templateUrl: './drone2d-genetic.component.html',
  styleUrls: ['./drone2d-genetic.component.scss'],
  providers:[ {
    provide: STEPPER_GLOBAL_OPTIONS,
    useValue: {displayDefaultIndicatorType: false},
  }]
})
export class Drone2dGeneticComponent implements AfterViewInit  {
  limitedWorkers?: TestLimitedWorkers;
  miniMenuGui?: GUI;
 

  displayedColumns: string[] = ['name', 'loss', 'score', 'reward', 'status', 'cicles'];
  students:Array<Student> =[];
  public bussy=false;
  public dsStudents = new MatTableDataSource<Student>(this.students);
  public isLearning=false;
  public isExaming=false;
  public progressNfo={
    visible:false,
    value:0,
    buffer:0
  };

  @ViewChild(ThreeRenderComponent) render!: ThreeRenderComponent;
  @ViewChild(MatTable) table!: MatTable<Student>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('stepper') private myStepper!: MatStepper;


  constructor(private helloService: HelloWorkerService, private workerSrv: LearnWorkerService, private db: DbService){}

  ngAfterViewInit(): void {
    this.dsStudents.paginator = this.paginator;
  }

  testCreateStudents(){
    for(let i=0; i<7; i++){
      const n=new Student();
      n.name=`St_${i}`;
      this.students.push(n);
    }
    this.dsStudents.data=this.students;
    setTimeout(() => {
      this.myStepper.next();
    }, 1000);    
  }

  testHelloWorker(){
    /* if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../../workers/hello.worker', import.meta.url));
      worker.onmessage = ({ data }) => {
        console.log(`testHelloWorker got message: ${data}`);
      };
      worker.postMessage('hello2');
      worker.postMessage('hello3');
    } */

    this.helloService.countApple(Random.nexti(0,200), (r:number)=>{console.log(r);});
  }

 /**
  * Launch in parallel students (drones) in leanr cicles
  */
  StudentsWorkingLearn(){
    this.isLearning=true;
    const thats=this;
    const numStudents=this.students.length;
    this.setProgress(0, numStudents);
    const obs$=from(this.students).pipe(tap((s)=>{
      console.log(`tap: "${s.name}"`);
      s.status=StudentStatus.enqueue;
    }));
    this.workerSrv.CicleLeanrStudents3(obs$).subscribe(
      {
        next(value){
          console.log(`[Drone2dGenetic] StudentsWorkingLearn() Rx proceso name: "${value.value.name}" - status: "${SatusWorking[value.status]}"`);
          if(value.nfo) console.log(`count: ${value.nfo.count} pending: ${value.nfo.pending}`);
          switch(value.status){
            case SatusWorking.working:value.value.status=StudentStatus.study;
            break;
            case SatusWorking.finished:value.value.status=StudentStatus.none;
            break;
          }
          if(value.status===SatusWorking.working){
            value.value.status=StudentStatus.study;
          }   
          if(value.nfo){
            thats.setProgress(value.nfo.count, numStudents, value.nfo.pending);
          }
        },
        complete(){
           console.log('[Drone2dGenetic] StudentsWorkingLearn() Complete observable.');
           thats.isLearning=false;
           thats.setProgress(0,0);
        },
        error(err){console.error(err);}        
      }
    );
  }

  testWorkStudent(){
    console.log('[Drone2dGenetic] testWorkStudent()');
    const res=this.workerSrv.CicleLearnStudents(this.students);
    res.subscribe(
      {
        next: (student)=>{
          console.log(`[Drone2dGenetic] Acabado el "${student.name}"`);
        },
        complete: ()=>{ console.log('[Drone2dGenetic] testWorkStudent() Se acabó');},
        error: (err)=>{console.error('Fallo en el clicle learning', err);}
      }
    );
  }

  test1(){
    this.limitedWorkers=new TestLimitedWorkers();
    this.limitedWorkers.LimitedConcurrent().pipe(take(12)).subscribe({
      next(x) {
        console.log('got worker free value ' + x);
      },
      error(err) {  console.error('something wrong occurred: ' + err); },
      complete() { console.log('done'); }
    });
  }

  test2(){
    if(!this.limitedWorkers) return;
    this.limitedWorkers.FreeOne();
  }

  test3(){
    const obs$=from(this.students).pipe(tap((s)=>s.status=StudentStatus.enqueue));
    this.workerSrv.CicleLeanrStudents3(obs$).subscribe(
      {
        next(value){
          console.log(`Rx proceso ${value.value.name} - ${value.status}`);
          switch(value.status){
            case SatusWorking.working:value.value.status=StudentStatus.study;
            break;
            case SatusWorking.finished:value.value.status=StudentStatus.none;
            break;
          }
          if(value.status===SatusWorking.working){
            value.value.status=StudentStatus.study;
          }           
        },
        complete(){ console.log('Acabose');},
        error(err){console.error(err);}
      }
    );
  }

  loadStudents() {
    this.db.table('myStore1').get
    }
  async saveStudents() {
    /* const data={
      empName: 'Basi pollo', 
      empSal: 1002,
      films:["life of Brian", "Mean of life"]
    };
    this.db.table('myStore1')
    .add(data)
    .then((data) => console.log(data))
    .catch((err) => console.log(err.message));*/
    const ss=this.students[0].getSerializedState();
    const r=await this.db.saveStudent(ss);
  } 

  private setProgress(count:number, max:number, pending=0){
    if(count<0 || max<=0){
      this.progressNfo.visible=false;
      return; 
    }
    if(!this.progressNfo.visible){
       this.progressNfo.visible=true;
    }
    const buffer=100*count/max;  
    const value=100*(count-pending) /max;     
    this.progressNfo.value=value;    
    this.progressNfo.buffer=buffer;
  }
}
