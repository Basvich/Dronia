import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicScene2Component } from './basic-scene2.component';
import { AppModule } from '../../app.module';
import { vi } from 'vitest';
import { TDrone3D } from '../../Objects/Drone3D';
import { DroneLearnContext } from '../../NetsIA/DroneLearnContext';
import { AdapterDroneTf2 } from '../../NetsIA/AdapterDroneTf';
import { Model1D2 } from '../../NetsIA/ModelIA1D';
import { ThreeRenderComponent } from 'src/app/three-render/three-render.component';
import { Drone1AcurrateComponent } from '../../graph/drone1-acurrate/drone1-acurrate.component';
import { By } from '@angular/platform-browser';

describe('BasicScene2Component', () => {
  let component: BasicScene2Component;
  let fixture: ComponentFixture<BasicScene2Component>;

  beforeEach(() => {
    vi.spyOn(ThreeRenderComponent.prototype, 'ngAfterViewInit').mockImplementation(() => undefined);
    vi.spyOn(BasicScene2Component.prototype, 'ngAfterViewInit').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      imports: [AppModule]
    });
    TestBed.overrideComponent(Drone1AcurrateComponent, { set: { template: '' } });
    fixture = TestBed.createComponent(BasicScene2Component);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('cambia la recompensa desde el selector y reinicia el experimento', async () => {
    fixture.detectChanges();
    const drone = new TDrone3D(0, 0);
    const context = new DroneLearnContext(drone, () => new Model1D2(), () => new AdapterDroneTf2(drone));
    component.droneLearnCtx = context;
    component.ciclesCount = 5;
    component.autoPilotOn = true;
    const dispose = vi.spyOn(context, 'Dispose');
    fixture.detectChanges();
    const graph = fixture.debugElement.query(By.directive(Drone1AcurrateComponent)).componentInstance;

    const selector: HTMLSelectElement = fixture.nativeElement.querySelector('#reward-mode');
    selector.value = 'pid';
    selector.dispatchEvent(new Event('change'));
    expect(component.rewardMode).toBe('pid');
    expect(component.droneLearnCtx).toBeUndefined();
    expect(component.ciclesCount).toBe(0);
    expect(component.autoPilotOn).toBe(false);
    expect(dispose).toHaveBeenCalledOnce();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(Drone1AcurrateComponent))).toBeNull();

    const newContext = new DroneLearnContext(drone, () => new Model1D2(), () => new AdapterDroneTf2(drone), 'pid');
    component.droneLearnCtx = newContext;
    fixture.detectChanges();
    const newGraph = fixture.debugElement.query(By.directive(Drone1AcurrateComponent)).componentInstance;
    expect(newGraph).not.toBe(graph);
    expect(newGraph.droneContext).toBe(newContext);

    component.bussy = true;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(selector.disabled).toBe(true);
    component.setRewardMode('pd');
    expect(component.rewardMode).toBe('pid');
    component.ngOnDestroy();
  });
});
