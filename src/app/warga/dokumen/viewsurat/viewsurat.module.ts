import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ViewsuratPageRoutingModule } from './viewsurat-routing.module';

import { ViewsuratPage } from './viewsurat.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViewsuratPageRoutingModule
  ],
  declarations: [ViewsuratPage]
})
export class ViewsuratPageModule {}
