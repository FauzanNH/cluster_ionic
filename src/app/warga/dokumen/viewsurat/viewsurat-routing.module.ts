import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewsuratPage } from './viewsurat.page';

const routes: Routes = [
  {
    path: ':surat_id',
    component: ViewsuratPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewsuratPageRoutingModule {}
