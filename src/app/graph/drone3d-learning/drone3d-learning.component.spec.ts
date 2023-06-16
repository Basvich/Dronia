import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Drone3dLearningComponent } from './drone3d-learning.component';

describe('Drone3dLearningComponent', () => {
  let component: Drone3dLearningComponent;
  let fixture: ComponentFixture<Drone3dLearningComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Drone3dLearningComponent]
    });
    fixture = TestBed.createComponent(Drone3dLearningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
