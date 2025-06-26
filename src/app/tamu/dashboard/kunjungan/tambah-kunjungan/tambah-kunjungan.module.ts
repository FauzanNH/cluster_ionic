import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TambahKunjunganPageRoutingModule } from './tambah-kunjungan-routing.module';

import { TambahKunjunganPage } from './tambah-kunjungan.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TambahKunjunganPageRoutingModule
  ],
  declarations: [TambahKunjunganPage]
})
export class TambahKunjunganPageModule {}
