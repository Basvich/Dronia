import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AdapterDrone2D } from '../../NetsIA/AdapterDroneTf';
import { DroneLearn3DContext } from '../../NetsIA/DroneLearn3DContext';
import { ModelDron2D } from '../../NetsIA/ModelIA1D';
import { TDrone3D } from '../../Objects/Drone3D';
import { Drone2dComponent } from './drone2d.component';

describe('Drone2dComponent', () => {
  let component: Drone2dComponent;
  let fixture: ComponentFixture<Drone2dComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Drone2dComponent]
    });
    fixture = TestBed.createComponent(Drone2dComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('permite reintentar si el entrenamiento falla', async () => {
    const drone = new TDrone3D(0, 0);
    const context = new DroneLearn3DContext(drone, () => new ModelDron2D(), () => new AdapterDrone2D(drone));
    component.drone = drone;
    component.droneLearnCtx = context;
    vi.spyOn(context, 'LearnCicleAgregated').mockRejectedValue(new Error('fallo'));
    vi.spyOn(console, 'clear').mockImplementation(() => undefined);
    try {
      await expect(component.testDroneLearnContext()).rejects.toThrow('fallo');
      expect(component.bussy).toBe(false);
    } finally {
      context.dispose();
      vi.restoreAllMocks();
    }
  });
});
