import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TambahpengaduanPageRoutingModule } from './tambahpengaduan-routing.module';

import { TambahpengaduanPage } from './tambahpengaduan.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TambahpengaduanPageRoutingModule
  ],
  declarations: [TambahpengaduanPage]
})
export class TambahpengaduanPageModule {}
