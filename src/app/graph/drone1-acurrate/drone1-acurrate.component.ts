import { AfterViewInit, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Observable, Subject, takeUntil } from 'rxjs';
import { DroneLearnContext } from 'src/app/NetsIA/DroneLearnContext';

interface IInitialPos {
  posY: number;
  velY: number;
}

/** Muestra las recompensas obtentidas para unas condicienes iniciales prefijadas.
 * Permite ver si mejoramos en el aprendizaje
 */
@Component({
  selector: 'app-drone1-acurrate',
  templateUrl: './drone1-acurrate.component.html',
  styleUrls: ['./drone1-acurrate.component.scss']
})
export class Drone1AcurrateComponent implements OnInit, AfterViewInit, OnDestroy {
  
  private ngUnsubscribe: Subject<void> = new Subject<void>();
  cicleCount=0;
  /**Ultima media calculada */
  lastMean=0;

  @Input() InitialPos?: IInitialPos[];
  /**El contexto, que contiene red y adaptador*/
  @Input() droneContext?: DroneLearnContext;

  /** Cuenta de ciclos realizados. Sirve tambien para autorefresco */
  @Input() ciclesCount?:Observable<number>;


  @ViewChild(BaseChartDirective) ngChart!: BaseChartDirective;

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: false
  };
  public lineChartLegend = true;


  ngOnInit(): void {
    if(this.ciclesCount!==undefined){
      this.ciclesCount.pipe(takeUntil(this.ngUnsubscribe)).subscribe({
        next: (value)=>{
          this.cicleCount=value;
          this.updateCharFromModel(value);
          this.ngChart.update();   
        }
      });
    }
  }

  ngAfterViewInit(): void {
    this.initChartOptions();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private initChartOptions() {
    let labelsPos: string[] = [];
    if (this.InitialPos) labelsPos = this.InitialPos.map((v) => { return `P${v.posY}V${v.velY}`; });
    const datasets0 = labelsPos.map((v) => { return { data: [], label: v, fill: false }; });
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


  private updateCharFromModel(cicleCount:number){
    if(!this.droneContext || !this.InitialPos || !this.ngChart.chart) return;
    let i=0;
    this.ngChart.chart.data.labels?.push(cicleCount);
    let sum=0;
    for(const v of this.InitialPos){
      const r=this.droneContext.simulateCicle(v.posY, v.velY);
      this.ngChart.chart.data.datasets[i].data.push(r.mean);
      sum+=r.mean;
      i++;
    }
    this.lastMean=sum/this.InitialPos.length;
  }
}
