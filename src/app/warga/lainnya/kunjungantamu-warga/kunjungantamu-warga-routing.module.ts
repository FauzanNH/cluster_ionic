import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { KunjungantamuWargaPage } from './kunjungantamu-warga.page';
import { DetailPage } from './detail/detail.page';

const routes: Routes = [
  {
    path: '',
    component: KunjungantamuWargaPage
  },
  {
    path: 'detail/:kunjungan_id',
    component: DetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class KunjungantamuWargaPageRoutingModule {}
