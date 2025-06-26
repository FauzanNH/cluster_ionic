import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChatSatpamPage } from './chat-satpam.page';
import { ViewchatSatpamPage } from './viewchat-satpam/viewchat-satpam.page';

const routes: Routes = [
  {
    path: '',
    component: ChatSatpamPage
  },
  {
    path: 'viewchat-satpam/:id',
    component: ViewchatSatpamPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChatSatpamPageRoutingModule {}
