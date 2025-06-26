import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewchatSatpamPage } from './viewchat-satpam.page';

const routes: Routes = [
  {
    path: '',
    component: ViewchatSatpamPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewchatSatpamPageRoutingModule {}
