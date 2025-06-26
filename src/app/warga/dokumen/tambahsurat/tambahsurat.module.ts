import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TambahsuratPageRoutingModule } from './tambahsurat-routing.module';

import { TambahsuratPage } from './tambahsurat.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TambahsuratPageRoutingModule,
    ReactiveFormsModule
  ],
  declarations: [TambahsuratPage]
})
export class TambahsuratPageModule {}
