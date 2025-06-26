import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthInterceptor } from './auth.interceptor';
import { FingerprintAIO } from '@awesome-cordova-plugins/fingerprint-aio/ngx';
import { PinModalComponent } from './warga/pin-modal/pin-modal.component';
import { FingerprintModalComponent } from './warga/fingerprint-modal/fingerprint-modal.component';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule, 
    IonicModule.forRoot({
      mode: 'md',
    }), 
    IonicStorageModule.forRoot(),
    AppRoutingModule, 
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    PinModalComponent,
    FingerprintModalComponent
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    FingerprintAIO,
    { provide: 'CAMERA', useValue: Camera },
    { provide: 'FILESYSTEM', useValue: Filesystem }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
