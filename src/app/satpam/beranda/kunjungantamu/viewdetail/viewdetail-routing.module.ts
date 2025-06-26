import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewdetailPage } from './viewdetail.page';

const routes: Routes = [
  {
    path: '',
    component: ViewdetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewdetailPageRoutingModule {}
