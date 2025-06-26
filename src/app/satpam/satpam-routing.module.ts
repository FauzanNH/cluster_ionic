import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SatpamPage } from './satpam.page';

const routes: Routes = [
  {
    path: '',
    component: SatpamPage,
    children: [
      {
        path: 'beranda',
        loadChildren: () => import('./beranda/beranda.module').then(m => m.BerandaPageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('./profile/profile.module').then(m => m.ProfilePageModule)
      },
      {
        path: 'lainnya',
        loadChildren: () => import('./lainnya/lainnya.module').then(m => m.LainnyaPageModule)
      },
      {
        path: 'chat-satpam',
        loadChildren: () => import('./chat-satpam/chat-satpam.module').then( m => m.ChatSatpamPageModule)
      },
      {
        path: '',
        redirectTo: 'beranda',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SatpamPageRoutingModule {}
