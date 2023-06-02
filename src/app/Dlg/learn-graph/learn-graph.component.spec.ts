import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LearnGraphComponent } from './learn-graph.component';

describe('LearnGraphComponent', () => {
  let component: LearnGraphComponent;
  let fixture: ComponentFixture<LearnGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LearnGraphComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LearnGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
