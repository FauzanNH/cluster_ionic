import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { ScanBerhasilPageRoutingModule } from './scan-berhasil-routing.module';
import { ScanBerhasilComponent } from './scan-berhasil.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ScanBerhasilPageRoutingModule,
    ScanBerhasilComponent
  ],
  declarations: []
})
export class ScanBerhasilPageModule {}
