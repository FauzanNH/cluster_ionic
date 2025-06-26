import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TamuKeluarPage } from './tamu-keluar.page';

const routes: Routes = [
  {
    path: '',
    component: TamuKeluarPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TamuKeluarPageRoutingModule {} 