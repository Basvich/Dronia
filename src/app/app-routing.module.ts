import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BasicSceneComponent } from './basic-scene/basic-scene.component';
import { TestModelsComponent } from './pages/test-models/test-models.component';

const routes: Routes = [
  {path:'', redirectTo:'/BasicScene', pathMatch:'full'},
  {path: 'BasicScene', component: BasicSceneComponent },
  {path: 'TestModels', component:TestModelsComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
