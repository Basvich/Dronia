import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/material.module';
import { BasicSceneComponent } from './basic-scene/basic-scene.component';
import { ThreeRenderComponent } from './three-render/three-render.component';
import { LearnGraphComponent } from './Dlg/learn-graph/learn-graph.component';
import { Drone1DComponent } from './graph/drone1-d/drone1-d.component';
import { NgChartsModule } from 'ng2-charts';
import { FormsModule } from '@angular/forms';
import { Drone1AcurrateComponent } from './graph/drone1-acurrate/drone1-acurrate.component';
import { TestModelsComponent } from './pages/test-models/test-models.component';
import { BasicScene2Component } from './pages/basic-scene2/basic-scene2.component';
import { Drone2dComponent } from './pages/drone2d/drone2d.component';
import { Drone3dLearningComponent } from './graph/drone3d-learning/drone3d-learning.component';


@NgModule({
  declarations: [
    AppComponent,
    BasicSceneComponent,
    ThreeRenderComponent,
    LearnGraphComponent,
    Drone1DComponent,
    Drone1AcurrateComponent,
    TestModelsComponent,
    BasicScene2Component,    
    Drone2dComponent,
    Drone3dLearningComponent    
  ],
  imports: [
    MaterialModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,    
    NgChartsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
