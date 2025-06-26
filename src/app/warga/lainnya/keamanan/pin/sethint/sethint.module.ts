import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SethintPageRoutingModule } from './sethint-routing.module';

import { SethintPage } from './sethint.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SethintPageRoutingModule
  ],
  declarations: [SethintPage]
})
export class SethintPageModule {}
