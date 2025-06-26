import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule } from '@ionic/angular';

import { KunjunganPageRoutingModule } from './kunjungan-routing.module';

import { KunjunganPage } from './kunjungan.page';
import { QRCodeModule } from 'angularx-qrcode';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    KunjunganPageRoutingModule,
    HttpClientModule,
    QRCodeModule
  ],
  declarations: [KunjunganPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class KunjunganPageModule {}
