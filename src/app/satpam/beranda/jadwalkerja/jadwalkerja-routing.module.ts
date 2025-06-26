import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { JadwalkerjaPage } from './jadwalkerja.page';

const routes: Routes = [
  {
    path: '',
    component: JadwalkerjaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class JadwalkerjaPageRoutingModule {}
