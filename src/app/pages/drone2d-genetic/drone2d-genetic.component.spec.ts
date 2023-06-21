import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Drone2dGeneticComponent } from './drone2d-genetic.component';

describe('Drone2dGeneticComponent', () => {
  let component: Drone2dGeneticComponent;
  let fixture: ComponentFixture<Drone2dGeneticComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Drone2dGeneticComponent]
    });
    fixture = TestBed.createComponent(Drone2dGeneticComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
