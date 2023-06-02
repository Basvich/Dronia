import { Component, Input } from '@angular/core';
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { Model1D } from 'src/app/NetsIA/ModelIA1D';

@Component({
  selector: 'app-drone1-d',
  templateUrl: './drone1-d.component.html',
  styleUrls: ['./drone1-d.component.scss']
})
export class Drone1DComponent {
  public VelY=0.5;

  public chartData:number[][]=Array<number[]>(5);

  /**La red que usa para mostrar los datos de recompensas esperadas */
  @Input() model1D: Model1D | undefined;



  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July'
    ],
    datasets: [
      {
        data: [ 65, 59, 80, 81, 56, 55, 40 ],
        label: 'Series A',
        fill: true,
        tension: 0.5,
        borderColor: 'black',
        backgroundColor: 'rgba(255,0,0,0.3)'
      }
    ]
  };
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: false
  };
  public lineChartLegend = true;

  constructor() {
    this.initChartData();
  }

  ngOnInit() {
  }

  public changedVel(){

  }

  private initChartData(){
    for(let i=0;i<5;i++){
      const data=this.chartData[i];
      for(let x=0;x<=12;x++){
        data.push(i*0.1+x);
      }
    }
  }

}
