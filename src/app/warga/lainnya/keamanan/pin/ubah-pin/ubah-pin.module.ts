import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { UbahPinPageRoutingModule } from './ubah-pin-routing.module';

import { UbahPinPage } from './ubah-pin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    UbahPinPageRoutingModule
  ],
  declarations: [UbahPinPage]
})
export class UbahPinPageModule {}
