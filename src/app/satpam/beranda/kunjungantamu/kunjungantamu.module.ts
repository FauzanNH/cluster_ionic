import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule } from '@ionic/angular';

import { KunjungantamuPageRoutingModule } from './kunjungantamu-routing.module';

import { KunjungantamuPage } from './kunjungantamu.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    KunjungantamuPageRoutingModule,
    HttpClientModule
  ],
  declarations: [KunjungantamuPage]
})
export class KunjungantamuPageModule {}
