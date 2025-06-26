import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PilihScanPage } from './pilih-scan.page';

const routes: Routes = [
  {
    path: '',
    component: PilihScanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PilihScanPageRoutingModule {} 