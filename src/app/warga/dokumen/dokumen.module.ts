import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DokumenPageRoutingModule } from './dokumen-routing.module';

import { DokumenPage } from './dokumen.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DokumenPageRoutingModule
  ],
  declarations: [DokumenPage]
})
export class DokumenPageModule {}
