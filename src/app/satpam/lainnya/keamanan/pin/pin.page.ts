import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

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
    isActive: false,
    lastChanged: undefined
  };

  public isCheckingPin: boolean = false;
  public pinSecurityEnabled: boolean = false;
  public isTogglingPinSecurity: boolean = false;

  constructor(
    private alertController: AlertController,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // Simulasi cek status PIN
    this.checkPinStatus();
  }

  ionViewWillEnter() {
    // Ambil status keamanan PIN dari localStorage
    this.getPinSecurityStatus();
  }

  async checkPinStatus() {
    this.isCheckingPin = true;
    
    // Simulasi pengecekan PIN dari localStorage
    setTimeout(() => {
      const pinData = localStorage.getItem('satpam_pin_data');
      if (pinData) {
        try {
          const data = JSON.parse(pinData);
          this.pinInfo = {
            isActive: data.isActive || false,
            lastChanged: data.lastChanged ? new Date(data.lastChanged) : undefined
          };
        } catch (e) {
          this.pinInfo = {
            isActive: false,
            lastChanged: undefined
          };
        }
      }
      this.isCheckingPin = false;
    }, 1000);
  }

  async getPinSecurityStatus() {
    // Simulasi mendapatkan status keamanan PIN dari localStorage
    const pinSecurityData = localStorage.getItem('satpam_pin_security');
    if (pinSecurityData) {
      try {
        const data = JSON.parse(pinSecurityData);
        this.pinSecurityEnabled = data.enabled || false;
      } catch (e) {
        this.pinSecurityEnabled = false;
      }
    } else {
      this.pinSecurityEnabled = false;
    }
  }

  refreshData(event: any) {
    // Refresh PIN security status
    this.getPinSecurityStatus();
    
    // Refresh PIN status
    this.checkPinStatus();
    
    // Selesaikan refresh setelah 1 detik
    setTimeout(() => {
      console.log('PIN page data refreshed');
      event.target.complete();
    }, 1000);
  }

  async togglePinSecurity(event: any) {
    const enabled = event.detail.checked;
    
    // Simulasi loading
    this.isTogglingPinSecurity = true;
    
    // Simulasi proses update keamanan PIN
    setTimeout(() => {
      // Simpan ke localStorage
      localStorage.setItem('satpam_pin_security', JSON.stringify({ enabled }));
      
      // Update status di UI
      this.pinSecurityEnabled = enabled;
      
      // Tampilkan toast
      this.presentToast(
        enabled ? 'Keamanan PIN saat akses aplikasi diaktifkan' : 'Keamanan PIN saat akses aplikasi dinonaktifkan',
        'success'
      );
      
      this.isTogglingPinSecurity = false;
    }, 1000);
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
    // Simulasi loading
    this.isCheckingPin = true;
    
    // Simulasi proses hapus PIN
    setTimeout(() => {
      // Update status PIN di localStorage
      localStorage.setItem('satpam_pin_data', JSON.stringify({
        isActive: false,
        lastChanged: new Date()
      }));
      
      // Update status PIN di UI
      this.pinInfo.isActive = false;
      
      // Nonaktifkan keamanan PIN
      localStorage.setItem('satpam_pin_security', JSON.stringify({ enabled: false }));
      this.pinSecurityEnabled = false;
      
      // Tampilkan alert sukses
      this.alertController.create({
        header: 'Berhasil',
        message: 'PIN berhasil dihapus dan dinonaktifkan.',
        buttons: ['OK']
      }).then(alert => alert.present());
      
      this.isCheckingPin = false;
    }, 1500);
  }

  get pinActive(): boolean {
    return this.pinInfo.isActive;
  }

  get pinStatus(): string {
    return this.pinInfo.isActive ? 'Aktif' : 'Tidak Aktif';
  }
}
