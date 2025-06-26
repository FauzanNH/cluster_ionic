import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UbahPinPage } from './ubah-pin.page';

const routes: Routes = [
  {
    path: '',
    component: UbahPinPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UbahPinPageRoutingModule {}
