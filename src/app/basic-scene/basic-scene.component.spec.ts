import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicSceneComponent } from './basic-scene.component';

describe('BasicSceneComponent', () => {
  let component: BasicSceneComponent;
  let fixture: ComponentFixture<BasicSceneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BasicSceneComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BasicSceneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
