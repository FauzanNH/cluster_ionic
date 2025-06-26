import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PengaduanPage } from './pengaduan.page';

const routes: Routes = [
  {
    path: '',
    component: PengaduanPage
  },
  {
    path: 'tambahpengaduan',
    loadChildren: () => import('./tambahpengaduan/tambahpengaduan.module').then( m => m.TambahpengaduanPageModule)
  },
  {
    path: 'viewpengaduan/:id',
    loadChildren: () => import('./viewpengaduan/viewpengaduan.module').then( m => m.ViewpengaduanPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PengaduanPageRoutingModule {}
