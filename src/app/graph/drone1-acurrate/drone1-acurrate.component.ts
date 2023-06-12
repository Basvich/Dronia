import { AfterViewInit, Component, DestroyRef, Input, OnInit, ViewChild, inject } from '@angular/core';
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
export class Drone1AcurrateComponent implements OnInit, AfterViewInit {  
  destroyRef = inject(DestroyRef);
  private destroyed: Subject<void> = new Subject<void>();
  cicleCount=0;
  /**Ultima media calculada */
  lastMean=0;

  @Input() InitialPos?: IInitialPos[];
  /**El contexto, que contiene red y adaptador*/
  @Input() droneContext?: DroneLearnContext;

  /** Cuenta de ciclos realizados. Sirve tambien para autorefresco */
  @Input() ciclesCount?:Observable<number>;


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
        min: -10,
        max: 20,
      }
    }
  };
  public lineChartLegend = true;


  ngOnInit(): void {
    if(this.ciclesCount!==undefined){
      this.ciclesCount.pipe(takeUntil(this.destroyed)).subscribe({
        next: (value:number)=>{
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
function takeUntilDestroyed(): import("rxjs").OperatorFunction<number, unknown> {
  throw new Error('Function not implemented.');
}

