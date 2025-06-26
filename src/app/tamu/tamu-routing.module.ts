import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TamuPage } from './tamu.page';

const routes: Routes = [
  {
    path: '',
    component: TamuPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./dashboard/dashboard.module').then( m => m.DashboardPageModule)
      },
      {
        path: 'kunjungan',
        loadChildren: () => import('./dashboard/kunjungan/kunjungan.module').then( m => m.KunjunganPageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('./profile/profile.module').then( m => m.ProfilePageModule)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'aktivitas',
    loadChildren: () => import('./aktivitas/aktivitas.module').then( m => m.AktivitasPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TamuPageRoutingModule {}
