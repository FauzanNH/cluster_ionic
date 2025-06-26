import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule } from '@ionic/angular';

import { KunjungantamuWargaPageRoutingModule } from './kunjungantamu-warga-routing.module';

import { KunjungantamuWargaPage } from './kunjungantamu-warga.page';
import { KunjungantamuWargaService } from './kunjungantamu-warga.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    KunjungantamuWargaPageRoutingModule,
    HttpClientModule
  ],
  declarations: [KunjungantamuWargaPage],
  providers: [KunjungantamuWargaService]
})
export class KunjungantamuWargaPageModule {}
