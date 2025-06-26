import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SetpinPage } from './setpin.page';

const routes: Routes = [
  {
    path: '',
    component: SetpinPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SetpinPageRoutingModule {}
