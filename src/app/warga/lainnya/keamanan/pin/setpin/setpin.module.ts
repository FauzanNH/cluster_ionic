import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SetpinPageRoutingModule } from './setpin-routing.module';

import { SetpinPage } from './setpin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SetpinPageRoutingModule
  ],
  declarations: [SetpinPage]
})
export class SetpinPageModule {}
