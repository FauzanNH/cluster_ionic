import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DokumenPage } from './dokumen.page';

const routes: Routes = [
  {
    path: '',
    component: DokumenPage
  },  {
    path: 'tambahsurat',
    loadChildren: () => import('./tambahsurat/tambahsurat.module').then( m => m.TambahsuratPageModule)
  },
  {
    path: 'viewsurat',
    loadChildren: () => import('./viewsurat/viewsurat.module').then( m => m.ViewsuratPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DokumenPageRoutingModule {}
