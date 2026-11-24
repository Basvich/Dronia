import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicScene2Component } from './basic-scene2.component';
import { AppModule } from '../../app.module';

describe('BasicScene2Component', () => {
  let component: BasicScene2Component;
  let fixture: ComponentFixture<BasicScene2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppModule]
    });
    fixture = TestBed.createComponent(BasicScene2Component);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
