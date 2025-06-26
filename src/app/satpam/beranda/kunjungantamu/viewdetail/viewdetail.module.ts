import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ViewdetailPageRoutingModule } from './viewdetail-routing.module';

import { ViewdetailPage } from './viewdetail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViewdetailPageRoutingModule
  ],
  declarations: [ViewdetailPage]
})
export class ViewdetailPageModule {}
