import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TamuMasukPage } from './tamu-masuk.page';

const routes: Routes = [
  {
    path: '',
    component: TamuMasukPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TamuMasukPageRoutingModule {} 