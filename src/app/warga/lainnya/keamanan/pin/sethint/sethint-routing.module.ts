import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SethintPage } from './sethint.page';

const routes: Routes = [
  {
    path: '',
    component: SethintPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SethintPageRoutingModule {}
