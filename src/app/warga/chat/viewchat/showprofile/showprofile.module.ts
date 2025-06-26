import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ShowprofilePageRoutingModule } from './showprofile-routing.module';

import { ShowprofilePage } from './showprofile.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ShowprofilePageRoutingModule
  ],
  declarations: [ShowprofilePage]
})
export class ShowprofilePageModule {}
