import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { KunjunganPage } from './kunjungan.page';

const routes: Routes = [
  {
    path: '',
    component: KunjunganPage
  },
  {
    path: 'tambah-kunjungan',
    loadChildren: () => import('./tambah-kunjungan/tambah-kunjungan.module').then( m => m.TambahKunjunganPageModule)
  },
  {
    path: 'view-kunjungan',
    loadChildren: () => import('./view-kunjungan/view-kunjungan.module').then( m => m.ViewKunjunganPageModule)
  },
  {
    path: 'view/:id',
    loadChildren: () => import('./view-kunjungan/view-kunjungan.module').then( m => m.ViewKunjunganPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class KunjunganPageRoutingModule {}
