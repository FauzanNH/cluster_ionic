import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BerandaPage } from './beranda.page';

const routes: Routes = [
  {
    path: '',
    component: BerandaPage
  },
  {
    path: 'kunjungantamu',
    loadChildren: () => import('./kunjungantamu/kunjungantamu.module').then( m => m.KunjungantamuPageModule)
  },
  {
    path: 'laporan-harian-tamu',
    loadChildren: () => import('./laporan-harian-tamu/laporan-harian-tamu.module').then( m => m.LaporanHarianTamuPageModule)
  },
  {
    path: 'jadwalkerja',
    loadChildren: () => import('./jadwalkerja/jadwalkerja.module').then( m => m.JadwalkerjaPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BerandaPageRoutingModule {}
