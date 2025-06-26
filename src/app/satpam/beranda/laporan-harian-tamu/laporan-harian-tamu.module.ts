import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LaporanHarianTamuPageRoutingModule } from './laporan-harian-tamu-routing.module';

import { LaporanHarianTamuPage } from './laporan-harian-tamu.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LaporanHarianTamuPageRoutingModule
  ],
  declarations: [LaporanHarianTamuPage]
})
export class LaporanHarianTamuPageModule {}
