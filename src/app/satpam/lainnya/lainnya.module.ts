import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule } from '@ionic/angular';

import { LainnyaPageRoutingModule } from './lainnya-routing.module';

import { LainnyaPage } from './lainnya.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HttpClientModule,
    LainnyaPageRoutingModule
  ],
  declarations: [LainnyaPage]
})
export class LainnyaPageModule {}
