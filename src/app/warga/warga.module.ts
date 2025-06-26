import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { WargaPageRoutingModule } from './warga-routing.module';
import { WargaPage } from './warga.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    WargaPageRoutingModule
  ],
  declarations: [
    WargaPage
  ],
  providers: [
    WargaPage
  ]
})
export class WargaPageModule {}
