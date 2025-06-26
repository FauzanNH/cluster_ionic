import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { KeluargaPage } from './keluarga.page';

const routes: Routes = [
  {
    path: '',
    component: KeluargaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class KeluargaPageRoutingModule {}
