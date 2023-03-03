import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BasicSceneComponent } from './basic-scene/basic-scene.component';

const routes: Routes = [
  {path:'', redirectTo:'/BasicScene', pathMatch:'full'},
  {path: 'BasicScene', component: BasicSceneComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
