import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreeRenderComponent } from './three-render.component';

describe('ThreeRenderComponent', () => {
  let component: ThreeRenderComponent;
  let fixture: ComponentFixture<ThreeRenderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ThreeRenderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreeRenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
