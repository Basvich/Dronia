import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreeRenderComponent } from './three-render.component';

describe('ThreeRenderComponent', () => {
  let component: ThreeRenderComponent;
  let fixture: ComponentFixture<ThreeRenderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ThreeRenderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreeRenderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
