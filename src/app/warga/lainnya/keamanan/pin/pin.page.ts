import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

interface PinInfo {
  isActive: boolean;
  lastChanged?: Date;
}

@Component({
  selector: 'app-pin',
  templateUrl: './pin.page.html',
  styleUrls: ['./pin.page.scss'],
  standalone: false,
})
export class PinPage implements OnInit {
  // PIN information
  pinInfo: PinInfo = {
    isActive: true,
    lastChanged: new Date('2023-10-15')
  };

  public isCheckingPin: boolean = false;
  public pinSecurityEnabled: boolean = false;
  public isTogglingPinSecurity: boolean = false;

  constructor(
    private alertController: AlertController,
    private http: HttpClient,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.checkPinStatusAndRedirect();
  }

  ionViewWillEnter() {
    this.getPinSecurityStatus();
  }

  async checkPinStatusAndRedirect() {
    this.isCheckingPin = true;
    const userStr = localStorage.getItem('user');
    let users_id = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        users_id = user.users_id || user.id || '';
      } catch (e) {}
    }
    if (!users_id) {
      this.isCheckingPin = false;
      this.router.navigate(['/warga/lainnya/keamanan/pin/setpin']);
      return;
    }

    this.http.post<any>(`${environment.apiUrl}/api/warga/keamanan/check-pin`, { users_id }).subscribe({
      next: (res) => {
        this.isCheckingPin = false;
        if (res && res.pin_active) {
          this.router.navigate(['/warga/lainnya/keamanan/pin']);
        } else {
          this.router.navigate(['/warga/lainnya/keamanan/pin/setpin']);
        }
      },
      error: () => {
        this.isCheckingPin = false;
        this.router.navigate(['/warga/lainnya/keamanan/pin/setpin']);
      }
    });
  }

  async getPinSecurityStatus() {
    const userStr = localStorage.getItem('user');
    let users_id = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        users_id = user.users_id || user.id || '';
      } catch (e) {}
    }
    if (!users_id) {
      return;
    }

    this.http.post<any>(`${environment.apiUrl}/api/warga/keamanan/get-pin-security`, { users_id }).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.pinSecurityEnabled = res.pin_security_enabled || false;
        }
      },
      error: () => {
        // Jika terjadi error, default ke false
        this.pinSecurityEnabled = false;
      }
    });
  }

  refreshData(event: any) {
    // Refresh PIN security status juga
    this.getPinSecurityStatus();
    
    // Simulate data refresh
    setTimeout(() => {
      console.log('PIN page data refreshed');
      this.pinInfo = {
        isActive: this.pinInfo.isActive,
        lastChanged: this.pinInfo.lastChanged
      };
      event.target.complete();
    }, 1000);
  }

  async togglePinSecurity(event: any) {
    const enabled = event.detail.checked;
    
    // Ambil users_id dari localStorage
    const userStr = localStorage.getItem('user');
    let users_id = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        users_id = user.users_id || user.id || '';
      } catch (e) {}
    }
    if (!users_id) {
      this.presentToast('User tidak ditemukan', 'danger');
      // Kembalikan toggle ke posisi sebelumnya
      this.pinSecurityEnabled = !enabled;
      return;
    }

    this.isTogglingPinSecurity = true;
    
    this.http.post<any>(`${environment.apiUrl}/api/warga/keamanan/set-pin-security`, { 
      users_id, 
      enabled 
    }).subscribe({
      next: (res) => {
        this.isTogglingPinSecurity = false;
        if (res && res.success) {
          this.pinSecurityEnabled = enabled;
          this.presentToast(
            enabled ? 'Keamanan PIN saat akses aplikasi diaktifkan' : 'Keamanan PIN saat akses aplikasi dinonaktifkan',
            'success'
          );
        } else {
          // Gagal update, kembalikan toggle
          this.pinSecurityEnabled = !enabled;
          this.presentToast(res.message || 'Gagal mengubah pengaturan keamanan PIN', 'danger');
        }
      },
      error: (err) => {
        this.isTogglingPinSecurity = false;
        // Gagal update, kembalikan toggle
        this.pinSecurityEnabled = !enabled;
        this.presentToast(err.error?.message || 'Terjadi kesalahan saat mengubah pengaturan keamanan PIN', 'danger');
      }
    });
  }

  async presentToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: color,
      cssClass: color === 'danger' ? 'error-toast' : ''
    });
    await toast.present();
  }

  async confirmDeletePin() {
    const alert = await this.alertController.create({
      header: 'Hapus PIN',
      message: 'Anda yakin ingin menghapus PIN? Fitur keamanan PIN akan dinonaktifkan.',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'Hapus',
          cssClass: 'alert-button-delete',
          handler: () => {
            this.deletePin();
          }
        }
      ]
    });

    await alert.present();
  }

  private deletePin() {
    // Ambil users_id dari localStorage
    const userStr = localStorage.getItem('user');
    let users_id = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        users_id = user.users_id || user.id || '';
      } catch (e) {}
    }
    if (!users_id) {
      // Tampilkan alert jika user tidak ditemukan
      this.alertController.create({
        header: 'Gagal',
        message: 'User tidak ditemukan.',
        buttons: ['OK']
      }).then(alert => alert.present());
      return;
    }

    // Tampilkan loading (opsional)
    this.isCheckingPin = true;

    // Panggil API hapus PIN
    this.http.post<any>(`${environment.apiUrl}/api/warga/keamanan/delete-pin`, { users_id }).subscribe({
      next: (res) => {
        this.isCheckingPin = false;
        if (res.success) {
          // Update status PIN di frontend
          this.pinInfo.isActive = false;
          // Tampilkan toast/success alert
          this.alertController.create({
            header: 'Berhasil',
            message: 'PIN berhasil dihapus dan dinonaktifkan.',
            buttons: ['OK']
          }).then(alert => alert.present());
        } else {
          this.alertController.create({
            header: 'Gagal',
            message: res.message || 'Gagal menghapus PIN.',
            buttons: ['OK']
          }).then(alert => alert.present());
        }
      },
      error: (err) => {
        this.isCheckingPin = false;
        this.alertController.create({
          header: 'Gagal',
          message: err.error?.message || 'Terjadi kesalahan saat menghapus PIN.',
          buttons: ['OK']
        }).then(alert => alert.present());
      }
    });
  }

  get pinActive(): boolean {
    return this.pinInfo.isActive;
  }

  get pinStatus(): string {
    return this.pinInfo.isActive ? 'Aktif' : 'Tidak Aktif';
  }
}
