import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LainnyaPage } from './lainnya.page';

const routes: Routes = [
  {
    path: '',
    component: LainnyaPage
  },  {
    path: 'keluarga',
    loadChildren: () => import('./keluarga/keluarga.module').then( m => m.KeluargaPageModule)
  },
  {
    path: 'policy',
    loadChildren: () => import('./policy/policy.module').then( m => m.PolicyPageModule)
  },
  {
    path: 'keamanan',
    loadChildren: () => import('./keamanan/keamanan.module').then( m => m.KeamananPageModule)
  },
  {
    path: 'kunjungantamu-warga',
    loadChildren: () => import('./kunjungantamu-warga/kunjungantamu-warga.module').then( m => m.KunjungantamuWargaPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LainnyaPageRoutingModule {}
