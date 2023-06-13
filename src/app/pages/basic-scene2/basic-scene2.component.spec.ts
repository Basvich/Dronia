import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicScene2Component } from './basic-scene2.component';

describe('BasicScene2Component', () => {
  let component: BasicScene2Component;
  let fixture: ComponentFixture<BasicScene2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BasicScene2Component]
    });
    fixture = TestBed.createComponent(BasicScene2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
