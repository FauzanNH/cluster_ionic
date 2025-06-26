import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { KeamananPageRoutingModule } from './keamanan-routing.module';
import { KeamananPage } from './keamanan.page';
import { PhoneModalComponent } from './phone-modal/phone-modal.component';
import { EmailModalComponent } from './email-modal/email-modal.component';
import { PasswordModalComponent } from './password-modal/password-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    KeamananPageRoutingModule,
    PhoneModalComponent,
    EmailModalComponent,
    PasswordModalComponent
  ],
  declarations: [KeamananPage]
})
export class KeamananPageModule {}
