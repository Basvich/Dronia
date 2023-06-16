import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Drone2dComponent } from './drone2d.component';

describe('Drone2dComponent', () => {
  let component: Drone2dComponent;
  let fixture: ComponentFixture<Drone2dComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Drone2dComponent]
    });
    fixture = TestBed.createComponent(Drone2dComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
