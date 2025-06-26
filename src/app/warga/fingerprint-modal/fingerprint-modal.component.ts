import { Component, OnInit, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ModalController, ToastController, IonicModule, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
// Haptics hanya digunakan jika diperlukan
// import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { FingerprintAIO, FingerprintOptions } from '@awesome-cordova-plugins/fingerprint-aio/ngx';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-fingerprint-modal',
  templateUrl: './fingerprint-modal.component.html',
  styleUrls: ['./fingerprint-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class FingerprintModalComponent implements OnInit {
  @Input() routeTo?: string;
  
  public isVerifying: boolean = false;
  public errorMessage: string = '';
  public showError: boolean = false;
  public maxAttempts: number = 3;
  public attempts: number = 0;
  public isDeviceSupported: boolean = false;
  public isPinEnabled: boolean = false;
  
  // Key baru untuk security
  private readonly SECURITY_KEY = 'security';
  private readonly FINGERPRINT_VALUE = 'fingerprint_is_active';

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private faio: FingerprintAIO,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.checkPinStatus().then(pinEnabled => {
      this.isPinEnabled = pinEnabled;
      
      // Jika PIN diaktifkan, tutup modal ini dan gunakan PIN modal saja
      if (this.isPinEnabled) {
        this.modalCtrl.dismiss({ usePinInstead: true });
        return;
      }
      
      // Hanya lanjutkan jika PIN tidak diaktifkan
      this.checkDeviceSupport();
      this.checkFingerprintEnabled();
    });
  }

  ionViewDidEnter() {
    // Segera jalankan verifikasi sidik jari saat modal muncul
    // hanya jika PIN tidak aktif
    if (!this.isPinEnabled) {
      setTimeout(() => {
        if (this.isDeviceSupported && this.isFingerprintEnabled()) {
          this.verifyFingerprint();
        }
      }, 300);
    }
  }
  
  // Periksa status PIN
  async checkPinStatus(): Promise<boolean> {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      return false;
    }

    try {
      const user = JSON.parse(userStr);
      const users_id = user.users_id || user.id || '';
      
      if (!users_id) {
        return false;
      }

      const response: any = await this.http.post(`${environment.apiUrl}/api/warga/keamanan/get-pin-security`, { 
        users_id 
      }).toPromise();

      return response && response.success && response.pin_security_enabled;
    } catch (error) {
      console.error('Error checking PIN status:', error);
      return false;
    }
  }
  
  // Memeriksa apakah fingerprint diaktifkan menggunakan key baru
  checkFingerprintEnabled() {
    if (!this.isFingerprintEnabled()) {
      // Jika tidak diaktifkan, tutup modal
      setTimeout(() => {
        this.modalCtrl.dismiss({ usePinInstead: true });
      }, 500);
    }
  }
  
  // Periksa status fingerprint dari localStorage
  isFingerprintEnabled(): boolean {
    const securitySettings = localStorage.getItem(this.SECURITY_KEY);
    if (securitySettings) {
      try {
        const settings = JSON.parse(securitySettings);
        return settings === this.FINGERPRINT_VALUE;
      } catch (e) {
        console.error('Error parsing security settings:', e);
        return false;
      }
    }
    return false;
  }

  async checkDeviceSupport() {
    try {
      const result = await this.faio.isAvailable();
      this.isDeviceSupported = !!result;
      
      if (!this.isDeviceSupported) {
        this.showErrorMessage('Perangkat tidak mendukung autentikasi sidik jari');
        setTimeout(() => {
          this.modalCtrl.dismiss({ cancelled: true, notSupported: true });
        }, 1000);
      }
    } catch (error) {
      console.error('Fingerprint not available:', error);
      this.isDeviceSupported = false;
      this.showErrorMessage('Perangkat tidak mendukung autentikasi sidik jari');
      setTimeout(() => {
        this.modalCtrl.dismiss({ cancelled: true, notSupported: true });
      }, 1000);
    }
  }

  cancel() {
    // Tampilkan pesan toast untuk memberitahu pengguna
    this.presentToast('Menutup aplikasi...');
    
    // Beri delay sebentar agar pesan toast terlihat
    setTimeout(() => {
      // Tutup modal fingerprint terlebih dahulu
      this.modalCtrl.dismiss({ cancelled: true }).then(() => {
        // Tutup aplikasi dengan App dari Capacitor
        if (this.platform.is('capacitor')) {
          App.exitApp();
        }
      });
    }, 1000);
  }

  async verifyFingerprint() {
    this.hideError();
    
    if (!this.isDeviceSupported) {
      this.showErrorMessage('Perangkat tidak mendukung autentikasi sidik jari');
      return;
    }
    
    this.isVerifying = true;
    
    try {
      // Tampilkan dialog autentikasi sidik jari dengan delay minimal
      // untuk memastikan UI sudah ter-render dengan baik
      const options: FingerprintOptions = {
        title: 'Autentikasi Sidik Jari',
        description: 'Pindai sidik jari Anda untuk login',
        disableBackup: false, // Izinkan alternatif jika biometrik gagal
        cancelButtonTitle: this.isPinEnabled ? 'Gunakan PIN' : 'Batal'
      };
      
      // Gunakan setTimeout untuk memastikan UI siap
      await this.faio.show(options);
      
      // Jika berhasil, tandai bahwa verifikasi sudah dilakukan
      localStorage.setItem('pin_verified', 'true');
      
      // Jika berhasil, tutup modal
      this.isVerifying = false;
      this.modalCtrl.dismiss({ success: true });
      
    } catch (error) {
      console.error('Fingerprint error:', error);
      this.isVerifying = false;
      this.attempts++;
      
      if (this.attempts >= this.maxAttempts) {
        this.presentToast('Terlalu banyak percobaan. Silakan gunakan PIN.');
        this.modalCtrl.dismiss({ usePinInstead: true });
      } else {
        if (error === 'Fingerprint authentication failed' || error === 'Fingerprint scan failed') {
          this.showErrorMessage('Sidik jari tidak dikenali. Sisa percobaan: ' + (this.maxAttempts - this.attempts));
        } else if (error === 'Fingerprint authentication canceled') {
          // Jika pengguna membatalkan, langsung alihkan ke PIN
          this.modalCtrl.dismiss({ usePinInstead: true });
        } else {
          this.showErrorMessage('Terjadi kesalahan. Sisa percobaan: ' + (this.maxAttempts - this.attempts));
        }
      }
    }
  }

  showErrorMessage(message: string) {
    this.errorMessage = message;
    this.showError = true;
  }

  hideError() {
    this.showError = false;
    this.errorMessage = '';
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }

  usePinInstead() {
    // Tutup modal sidik jari dan beri tahu untuk menggunakan PIN sebagai gantinya
    this.modalCtrl.dismiss({ usePinInstead: true });
  }
}