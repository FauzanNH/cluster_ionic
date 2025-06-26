import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TambahsuratPage } from './tambahsurat.page';

const routes: Routes = [
  {
    path: '',
    component: TambahsuratPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TambahsuratPageRoutingModule {}
