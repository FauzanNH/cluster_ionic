import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { KunjungantamuPage } from './kunjungantamu.page';

const routes: Routes = [
  {
    path: '',
    component: KunjungantamuPage
  },
  {
    path: 'tambah-akun-tamu',
    loadChildren: () => import('./tambah-akun-tamu/tambah-akun-tamu.module').then( m => m.TambahAkunTamuPageModule)
  },
  {
    path: 'viewdetail/:kunjungan_id',
    loadChildren: () => import('./viewdetail/viewdetail.module').then( m => m.ViewdetailPageModule)
  },
  {
    path: 'tamu-masuk',
    loadChildren: () => import('./tamu-masuk/tamu-masuk.module').then( m => m.TamuMasukPageModule)
  },
  {
    path: 'tamu-keluar',
    loadChildren: () => import('./tamu-keluar/tamu-keluar.module').then( m => m.TamuKeluarPageModule)
  },
  {
    path: 'pilih-scan',
    loadChildren: () => import('./pilih-scan/pilih-scan.module').then( m => m.PilihScanPageModule)
  },
  {
    path: 'scan-berhasil/:kunjungan_id/:tipe',
    loadChildren: () => import('./scan-berhasil/scan-berhasil.module').then( m => m.ScanBerhasilPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class KunjungantamuPageRoutingModule {}
