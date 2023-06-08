import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestModelsComponent } from './test-models.component';

describe('TestModelsComponent', () => {
  let component: TestModelsComponent;
  let fixture: ComponentFixture<TestModelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TestModelsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestModelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
