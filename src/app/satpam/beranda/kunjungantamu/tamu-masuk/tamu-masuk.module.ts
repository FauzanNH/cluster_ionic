import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TamuMasukPageRoutingModule } from './tamu-masuk-routing.module';

import { TamuMasukPage } from './tamu-masuk.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TamuMasukPageRoutingModule
  ],
  declarations: [TamuMasukPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TamuMasukPageModule {} 