import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { JadwalkerjaPageRoutingModule } from './jadwalkerja-routing.module';

import { JadwalkerjaPage } from './jadwalkerja.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    JadwalkerjaPageRoutingModule
  ],
  declarations: [JadwalkerjaPage]
})
export class JadwalkerjaPageModule {}
