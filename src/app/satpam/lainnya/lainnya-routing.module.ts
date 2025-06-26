import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LainnyaPage } from './lainnya.page';

const routes: Routes = [
  {
    path: '',
    component: LainnyaPage
  },  {
    path: 'keamanan',
    loadChildren: () => import('./keamanan/keamanan.module').then( m => m.KeamananPageModule)
  },
  {
    path: 'policy',
    loadChildren: () => import('./policy/policy.module').then( m => m.PolicyPageModule)
  },
  {
    path: 'guide',
    loadChildren: () => import('./guide/guide.module').then( m => m.GuidePageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LainnyaPageRoutingModule {}
