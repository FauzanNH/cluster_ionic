import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewpengaduanPage } from './viewpengaduan.page';

const routes: Routes = [
  {
    path: '',
    component: ViewpengaduanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewpengaduanPageRoutingModule {}
