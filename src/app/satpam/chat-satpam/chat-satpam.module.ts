import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';

import { ChatSatpamPageRoutingModule } from './chat-satpam-routing.module';
import { ChatComponentsModule } from '../../shared/chat-components/chat-components.module';

import { ChatSatpamPage } from './chat-satpam.page';
import { ViewchatSatpamPage } from './viewchat-satpam/viewchat-satpam.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatSatpamPageRoutingModule,
    ChatComponentsModule
  ],
  declarations: [
    ChatSatpamPage,
    ViewchatSatpamPage
  ],
  providers: [ModalController],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ChatSatpamPageModule {}
