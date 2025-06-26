import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ViewpengaduanPageRoutingModule } from './viewpengaduan-routing.module';

import { ViewpengaduanPage } from './viewpengaduan.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViewpengaduanPageRoutingModule
  ],
  declarations: [ViewpengaduanPage]
})
export class ViewpengaduanPageModule {}
