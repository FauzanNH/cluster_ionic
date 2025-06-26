import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { KeluargaPageRoutingModule } from './keluarga-routing.module';

import { KeluargaPage } from './keluarga.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    KeluargaPageRoutingModule
  ],
  declarations: [KeluargaPage]
})
export class KeluargaPageModule {}
