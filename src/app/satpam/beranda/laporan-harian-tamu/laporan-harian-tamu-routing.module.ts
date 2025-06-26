import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LaporanHarianTamuPage } from './laporan-harian-tamu.page';

const routes: Routes = [
  {
    path: '',
    component: LaporanHarianTamuPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LaporanHarianTamuPageRoutingModule {}
