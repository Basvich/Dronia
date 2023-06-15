import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BasicSceneComponent } from './basic-scene/basic-scene.component';
import { TestModelsComponent } from './pages/test-models/test-models.component';
import { BasicScene2Component } from './pages/basic-scene2/basic-scene2.component';
import { Drone2dComponent } from './pages/drone2d/drone2d.component';

const routes: Routes = [
  {path:'', redirectTo:'/BasicScene', pathMatch:'full'},
  {path: 'BasicScene', component: BasicSceneComponent },
  {path: 'BasicScene2', component:BasicScene2Component },
  {path: 'Drone2D', component:Drone2dComponent },
  {path: 'TestModels', component:TestModelsComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
