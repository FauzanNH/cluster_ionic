import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PilihScanPageRoutingModule } from './pilih-scan-routing.module';

import { PilihScanPage } from './pilih-scan.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PilihScanPageRoutingModule
  ],
  declarations: [PilihScanPage]
})
export class PilihScanPageModule {} 