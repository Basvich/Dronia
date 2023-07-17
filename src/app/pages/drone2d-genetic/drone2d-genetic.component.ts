import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import GUI from 'lil-gui';
import { from, take, tap } from 'rxjs';
import { Student,EnumIntToDescriptionPipe, StudentStatus } from 'src/app/NetsIA/Students';
import { Random } from 'src/app/Objects/utils';
import { HelloWorkerService } from 'src/app/services/HelloWorkerSrv';
import { LearnWorkerService, SatusWorking, TestLimitedWorkers } from 'src/app/services/LearnWorkerSrv';
import { ThreeRenderComponent } from 'src/app/three-render/three-render.component';


@Component({
  selector: 'app-drone2d-genetic',
  templateUrl: './drone2d-genetic.component.html',
  styleUrls: ['./drone2d-genetic.component.scss']
})
export class Drone2dGeneticComponent implements AfterViewInit  {  
  limitedWorkers?: TestLimitedWorkers;
  miniMenuGui?: GUI;
  displayedColumns: string[] = ['name', 'loss', 'score', 'reward', 'status', 'cicles'];
  students:Array<Student> =[];
  public bussy=false;
  public dsStudents = new MatTableDataSource<Student>(this.students);
  @ViewChild(ThreeRenderComponent) render!: ThreeRenderComponent;
  @ViewChild(MatTable) table!: MatTable<Student>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private helloService: HelloWorkerService, private workerSrv: LearnWorkerService){}

  ngAfterViewInit(): void {
    this.dsStudents.paginator = this.paginator;
  }

  testCreateStudents(){
    for(let i=0; i<20; i++){
      const n=new Student();
      n.name=`St_${i}`;
      this.students.push(n);
    }
    this.dsStudents.data=this.students;
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

  testWorkStudent(){
    const res=this.workerSrv.CicleLearnStudents(this.students);
    res.subscribe(
      {
        next: (student)=>{
          console.log(`Acabado ${student.name}`);
        },
        complete: ()=>{ console.log('Se acabo');}
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
    const obs$=from(this.students).pipe(tap(s=>s.status=StudentStatus.enqueue));
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
}
