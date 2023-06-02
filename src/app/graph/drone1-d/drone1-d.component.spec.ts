import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Drone1DComponent } from './drone1-d.component';

describe('Drone1DComponent', () => {
  let component: Drone1DComponent;
  let fixture: ComponentFixture<Drone1DComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ Drone1DComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Drone1DComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
