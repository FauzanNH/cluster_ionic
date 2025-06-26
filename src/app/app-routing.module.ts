import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'warga',
    loadChildren: () => import('./warga/warga.module').then( m => m.WargaPageModule)
  },
  {
    path: 'satpam',
    loadChildren: () => import('./satpam/satpam.module').then( m => m.SatpamPageModule)
  },
  {
    path: 'tamu',
    loadChildren: () => import('./tamu/tamu.module').then( m => m.TamuPageModule)
  },
  {
    path: 'lupapassword',
    loadChildren: () => import('./lupapassword/lupapassword.module').then( m => m.LupapasswordPageModule)
  },
  {
    path: 'login-tamu',
    loadChildren: () => import('./login-tamu/login-tamu.module').then( m => m.LoginTamuPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
