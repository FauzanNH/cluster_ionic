import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { KeamananPage } from './keamanan.page';

const routes: Routes = [
  {
    path: '',
    component: KeamananPage
  },  {
    path: 'sidikjari',
    loadChildren: () => import('./sidikjari/sidikjari.module').then( m => m.SidikjariPageModule)
  },
  {
    path: 'pin',
    loadChildren: () => import('./pin/pin.module').then( m => m.PinPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class KeamananPageRoutingModule {}
