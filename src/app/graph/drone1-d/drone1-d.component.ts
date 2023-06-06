import { AfterViewInit, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartOptions } from "chart.js";
import { BaseChartDirective } from 'ng2-charts';
import { Observable, Subject, takeUntil } from 'rxjs';
import { DroneLearnContext } from 'src/app/NetsIA/DroneLearnContext';


/**
 * Muestra para distintas velocidades del drone, las recompensas esperadas para cada posible acción
 */
@Component({
  selector: 'app-drone1-d',
  templateUrl: './drone1-d.component.html',
  styleUrls: ['./drone1-d.component.scss']
})
export class Drone1DComponent implements OnInit,  AfterViewInit, OnChanges, OnDestroy {
  
  private ngUnsubscribe: Subject<void> = new Subject<void>();
  public VelY=0.5;

  public chartData:number[][]=Array<number[]>(5);
  public cicleCount=0;

  @ViewChild(BaseChartDirective) chart!: BaseChartDirective;
  /**El contexto, que contiene red y adaptador*/  
  @Input() droneContext?: DroneLearnContext;
  /** Cuenta de ciclos realizados. Sirve tambien para autorefresco */
  @Input() ciclesCount?:Observable<number>;



  public lineChartData: ChartConfiguration<'line'>['data'] = {   
    labels:[],
    datasets: [
      {
        data: [],
        label: 'F0',
        fill: false        
      },
      {
        data: [],
        label: 'F0.5',
        fill:false
      },
      {
        data: [],
        label: 'F1',
        fill:false
      },
      {
        data: [],
        label: 'F1.5',
        fill:false
      },
      {
        data: [2,1,3],
        label: 'F2',
        fill:false
      }

    ]
  };
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: false
  };
  public lineChartLegend = true;

  ngOnInit(): void {
    if(this.ciclesCount!==undefined){
      this.ciclesCount.pipe(takeUntil(this.ngUnsubscribe)).subscribe({
        next: (value)=>{
          this.cicleCount=value;
          this.updateCharFromModel();
          this.chart.update();   
        }
      });
    }
  }

  ngAfterViewInit(): void {
    this.initChartData();
    this.chart.update();
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }


  public changedVel(){
    this.updateCharFromModel();
    this.chart.update();
  }

  private initChartData(){
    for(let i=0;i<5;i++){
      let data=this.chartData[i];
      if(!data){
        data=[];
        this.chartData[i]=data;
      }
      for(let x=0;x<=12;x+=0.5){
        data.push(i*0.1+x);
      }
    }   
    //this.chart.data=this.lineChartData; 
    if(this.chart?.data){
      this.chart.data.datasets[0].data=this.chartData[0];
      this.chart.data.datasets[1].data=this.chartData[1];
      this.chart.data.datasets[2].data=this.chartData[2];
      this.chart.data.datasets[3].data=this.chartData[3];
      this.chart.data.datasets[4].data=this.chartData[4];
      const labels=Array.from({length:25}, (item, index) => index*0.5);
      this.chart.data.labels=labels;
    }
  }

  private updateCharFromModel(){
    if(!this.droneContext) return;
    const dataIn:[number, number][]=[];
    for(let posY=0; posY<=12; posY+=0.5){
      dataIn.push([posY, this.VelY]);
    }
    const predicted=this.droneContext.predictValues(dataIn);
    const d=this.chartData;
    for(let i=0; i< predicted.length; i++){
      d[0][i]=predicted[i][0];
      d[1][i]=predicted[i][1];
      d[2][i]=predicted[i][2];
      d[3][i]=predicted[i][3];
      d[4][i]=predicted[i][4];
    }
  }
}
