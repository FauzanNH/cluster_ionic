import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PengaduanPageRoutingModule } from './pengaduan-routing.module';

import { PengaduanPage } from './pengaduan.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PengaduanPageRoutingModule
  ],
  declarations: [PengaduanPage]
})
export class PengaduanPageModule {}
