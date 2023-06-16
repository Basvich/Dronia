import { Component, DestroyRef, Input, ViewChild, inject } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Observable, Subject, takeUntil } from 'rxjs';
import { LearnInfo } from 'src/app/NetsIA/DroneLearnContext';




@Component({
  selector: 'app-drone3d-learning',
  templateUrl: './drone3d-learning.component.html',
  styleUrls: ['./drone3d-learning.component.scss']
})
export class Drone3dLearningComponent {
  destroyRef = inject(DestroyRef);
  private destroyed: Subject<void> = new Subject<void>();

  /** Cuenta de ciclos realizados. Sirve tambien para autorefresco */
  @Input() ciclesCount?:Observable<LearnInfo>;


  @ViewChild(BaseChartDirective) ngChart!: BaseChartDirective;

  constructor(){    
    this.destroyRef.onDestroy(() => {
      this.destroyed.next();
      this.destroyed.complete();
    });   
  }

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: false,
    scales:{
      y: {    
        type:'logarithmic',
        position:'left',
        title:{
          text:'loss',
          display: true
        }
      },
      y1:{
        type:'linear',
        position:'right',
        title:{
          text:'supervivencia',
          display: true
        }
      },
      x:{
        title:{
          display:true,
          text:"Ciclos"
        }
      }
    },    
  };
  public lineChartLegend = true;


  ngOnInit(): void {
    if(this.ciclesCount!==undefined){
      this.ciclesCount.pipe(takeUntil(this.destroyed)).subscribe({
        next: (value:LearnInfo)=>{    
          console.log(`[Drone3dLearning] recibido info cicles: value:${value.cicleCount}`)      ;
          this.updateCharFromModel(value);
          this.ngChart.update();   
        }
      });
    }
  }

  ngAfterViewInit(): void {
    this.initChartOptions();
  }

  private initChartOptions() {        
    const datasets0 = [
      { yAxisID: 'y', data: [], label: 'loss', fill: false},
      {yAxisID: 'y1', data: [], label: 'steps', fill: false}];
    const lineChartData: ChartConfiguration<'line'>['data'] = {
      labels: [],
      datasets: datasets0
    };
    if (this.ngChart) {
      //this.ngChart.chart!.data=dum1.data;
      this.ngChart.data=lineChartData;
      this.ngChart.render();
    }
  }

  private updateCharFromModel(cicleCount: LearnInfo){
    if(!this.ngChart.chart) return;
    this.ngChart.chart.data.labels?.push(cicleCount.cicleCount);  
    this.ngChart.chart.data.datasets[0].data.push(cicleCount.loss);
    this.ngChart.chart.data.datasets[1].data.push(cicleCount.stepsCount);
  }
}

