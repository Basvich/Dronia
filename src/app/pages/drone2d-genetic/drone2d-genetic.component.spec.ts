import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Drone2dGeneticComponent } from './drone2d-genetic.component';

describe('Drone2dGeneticComponent', () => {
  let component: Drone2dGeneticComponent;
  let fixture: ComponentFixture<Drone2dGeneticComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Drone2dGeneticComponent]
    });
    fixture = TestBed.createComponent(Drone2dGeneticComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
