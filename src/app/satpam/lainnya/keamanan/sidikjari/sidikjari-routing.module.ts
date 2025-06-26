import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SidikjariPage } from './sidikjari.page';

const routes: Routes = [
  {
    path: '',
    component: SidikjariPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SidikjariPageRoutingModule {}
