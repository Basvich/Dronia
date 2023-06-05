import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartOptions } from "chart.js";
import { BaseChartDirective } from 'ng2-charts';
import { DroneLearnContext } from 'src/app/NetsIA/DroneLearnContext';

@Component({
  selector: 'app-drone1-d',
  templateUrl: './drone1-d.component.html',
  styleUrls: ['./drone1-d.component.scss']
})
export class Drone1DComponent implements AfterViewInit, OnChanges {
  private lastCicleCount=-10;
  public VelY=0.5;

  public chartData:number[][]=Array<number[]>(5);

  @ViewChild(BaseChartDirective) chart!: BaseChartDirective;
  /**El contexto, que contiene red y adaptador*/  
  @Input() droneContext?: DroneLearnContext;
  /** Cuenta de ciclos realizados. Sirve tambien para autorefresco */
  @Input() cicleCount?:number;



  public lineChartData: ChartConfiguration<'line'>['data'] = {   
    labels:[],
    datasets: [
      {
        data: [],
        label: 'F0.5',
        fill: false        
      },
      {
        data: [],
        label: 'F0.8',
        fill:false
      },
      {
        data: [],
        label: 'F1',
        fill:false
      },
      {
        data: [],
        label: 'F1.2',
        fill:false
      },
      {
        data: [2,1,3],
        label: 'F1.5',
        fill:false
      }

    ]
  };
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: false
  };
  public lineChartLegend = true;

  ngAfterViewInit(): void {
    this.initChartData();
    this.chart.update();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['cicleCount']){
      if(this.cicleCount=== undefined) return;
      if((this.cicleCount-this.lastCicleCount)>5){
        this.lastCicleCount=this.cicleCount;
        this.updateCharFromModel();
        this.chart.update();
      }
    }
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
