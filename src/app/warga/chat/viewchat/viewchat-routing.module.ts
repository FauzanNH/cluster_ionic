import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewchatPage } from './viewchat.page';

const routes: Routes = [
  {
    path: '',
    component: ViewchatPage
  },
  {
    path: 'showprofile',
    loadChildren: () => import('./showprofile/showprofile.module').then( m => m.ShowprofilePageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewchatPageRoutingModule {}
