import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LoginTamuPageRoutingModule } from './login-tamu-routing.module';

import { LoginTamuPage } from './login-tamu.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LoginTamuPageRoutingModule
  ],
  declarations: [LoginTamuPage]
})
export class LoginTamuPageModule {}
