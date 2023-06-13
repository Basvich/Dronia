import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BasicSceneComponent } from './basic-scene/basic-scene.component';
import { TestModelsComponent } from './pages/test-models/test-models.component';
import { BasicScene2Component } from './pages/basic-scene2/basic-scene2.component';

const routes: Routes = [
  {path:'', redirectTo:'/BasicScene', pathMatch:'full'},
  {path: 'BasicScene', component: BasicSceneComponent },
  {path: 'BasicScene2', component:BasicScene2Component },
  {path: 'TestModels', component:TestModelsComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
