import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChatPageRoutingModule } from './chat-routing.module';
import { ChatComponentsModule } from '../../shared/chat-components/chat-components.module';

import { ChatPage } from './chat.page';
import { ViewchatPage } from './viewchat/viewchat.page';
import { ContactSearchModalComponent } from './contact-search-modal/contact-search-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatPageRoutingModule,
    ChatComponentsModule,
    ContactSearchModalComponent
  ],
  declarations: [
    ChatPage,
    ViewchatPage
  ]
})
export class ChatPageModule {}
