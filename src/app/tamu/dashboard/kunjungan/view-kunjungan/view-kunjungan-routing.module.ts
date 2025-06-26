import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewKunjunganPage } from './view-kunjungan.page';

const routes: Routes = [
  {
    path: '',
    component: ViewKunjunganPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewKunjunganPageRoutingModule {}
