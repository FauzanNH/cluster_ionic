import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TambahKunjunganPage } from './tambah-kunjungan.page';

const routes: Routes = [
  {
    path: '',
    component: TambahKunjunganPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TambahKunjunganPageRoutingModule {}
