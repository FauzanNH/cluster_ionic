import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ImagePreviewComponent } from '../../warga/chat/image-preview/image-preview.component';
import { DocumentPreviewComponent } from '../../warga/chat/document-preview/document-preview.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  declarations: [
    ImagePreviewComponent,
    DocumentPreviewComponent
  ],
  exports: [
    ImagePreviewComponent,
    DocumentPreviewComponent
  ]
})
export class ChatComponentsModule {} 