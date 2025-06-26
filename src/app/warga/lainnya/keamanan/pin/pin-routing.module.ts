import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PinPage } from './pin.page';

const routes: Routes = [
  {
    path: '',
    component: PinPage
  },  {
    path: 'setpin',
    loadChildren: () => import('./setpin/setpin.module').then( m => m.SetpinPageModule)
  },
  {
    path: 'ubah-pin',
    loadChildren: () => import('./ubah-pin/ubah-pin.module').then( m => m.UbahPinPageModule)
  },
  {
    path: 'sethint',
    loadChildren: () => import('./sethint/sethint.module').then( m => m.SethintPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PinPageRoutingModule {}
