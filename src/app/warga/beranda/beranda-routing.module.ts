import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BerandaPage } from './beranda.page';

const routes: Routes = [
  {
    path: '',
    component: BerandaPage
  },  {
    path: 'pengaduan',
    loadChildren: () => import('./pengaduan/pengaduan.module').then( m => m.PengaduanPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BerandaPageRoutingModule {}
