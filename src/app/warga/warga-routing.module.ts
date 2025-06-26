import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WargaPage } from './warga.page';

const routes: Routes = [
  {
    path: '',
    component: WargaPage,
    children: [
      {
        path: 'beranda',
        loadChildren: () => import('./beranda/beranda.module').then(m => m.BerandaPageModule)
      },
      {
        path: 'dokumen',
        loadChildren: () => import('./dokumen/dokumen.module').then(m => m.DokumenPageModule)
      },
      {
        path: 'chat',
        loadChildren: () => import('./chat/chat.module').then(m => m.ChatPageModule)
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
export class WargaPageRoutingModule {}
