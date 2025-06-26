import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TamuKeluarPageRoutingModule } from './tamu-keluar-routing.module';

import { TamuKeluarPage } from './tamu-keluar.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TamuKeluarPageRoutingModule
  ],
  declarations: [TamuKeluarPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TamuKeluarPageModule {} 