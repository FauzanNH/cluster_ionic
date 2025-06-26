import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ShowprofilePage } from './showprofile.page';

const routes: Routes = [
  {
    path: '',
    component: ShowprofilePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShowprofilePageRoutingModule {}
