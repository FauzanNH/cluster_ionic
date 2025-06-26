import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SidikjariPageRoutingModule } from './sidikjari-routing.module';

import { SidikjariPage } from './sidikjari.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SidikjariPageRoutingModule
  ],
  declarations: [SidikjariPage]
})
export class SidikjariPageModule {}
