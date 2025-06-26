import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { SatpamPageRoutingModule } from './satpam-routing.module';
import { SatpamPage } from './satpam.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    SatpamPageRoutingModule
  ],
  declarations: [SatpamPage],
  providers: [
    SatpamPage
  ]
})
export class SatpamPageModule {}
