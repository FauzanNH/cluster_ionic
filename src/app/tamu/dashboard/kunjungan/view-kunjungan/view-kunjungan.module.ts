import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ViewKunjunganPageRoutingModule } from './view-kunjungan-routing.module';

import { ViewKunjunganPage } from './view-kunjungan.page';
import { QRCodeModule } from 'angularx-qrcode';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViewKunjunganPageRoutingModule,
    QRCodeModule
  ],
  declarations: [ViewKunjunganPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ViewKunjunganPageModule {}
