import { NgModule } from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/material.module';
import { BasicSceneComponent } from './pages/basic-scene/basic-scene.component';
import { ThreeRenderComponent } from './three-render/three-render.component';
import { LearnGraphComponent } from './Dlg/learn-graph/learn-graph.component';
import { TestModelsComponent } from './pages/test-models/test-models.component';
import { BasicScene2Component } from './pages/basic-scene2/basic-scene2.component';
import { Drone2dComponent } from './pages/drone2d/drone2d.component';
import { Drone2dGeneticComponent } from './pages/drone2d-genetic/drone2d-genetic.component';


@NgModule({
    declarations: [
        AppComponent,
        BasicSceneComponent,        
        LearnGraphComponent,               
        TestModelsComponent,
        BasicScene2Component,       
    ],
    providers: [],
    bootstrap: [AppComponent],
    imports: [
        MaterialModule,
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,        
        FormsModule,
        ReactiveFormsModule,
        ThreeRenderComponent,        
        Drone2dComponent,
        Drone2dGeneticComponent
    ]
})
export class AppModule { }
