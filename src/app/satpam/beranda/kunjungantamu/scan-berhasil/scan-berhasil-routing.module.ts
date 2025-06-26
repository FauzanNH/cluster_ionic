import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ScanBerhasilComponent } from './scan-berhasil.component';

const routes: Routes = [
  {
    path: '',
    component: ScanBerhasilComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ScanBerhasilPageRoutingModule {}
