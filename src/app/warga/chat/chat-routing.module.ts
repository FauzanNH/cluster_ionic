import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChatPage } from './chat.page';
import { ViewchatPage } from './viewchat/viewchat.page';

const routes: Routes = [
  {
    path: '',
    component: ChatPage
  },
  {
    path: 'viewchat/:id',
    component: ViewchatPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChatPageRoutingModule {}
