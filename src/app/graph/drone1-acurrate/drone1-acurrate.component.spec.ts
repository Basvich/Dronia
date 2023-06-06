import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Drone1AcurrateComponent } from './drone1-acurrate.component';

describe('Drone1AcurrateComponent', () => {
  let component: Drone1AcurrateComponent;
  let fixture: ComponentFixture<Drone1AcurrateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ Drone1AcurrateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Drone1AcurrateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
