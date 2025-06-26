import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { TambahAkunTamuPage } from './tambah-akun-tamu.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: TambahAkunTamuPage
      }
    ])
  ],
  declarations: [TambahAkunTamuPage]
})
export class TambahAkunTamuPageModule {}
