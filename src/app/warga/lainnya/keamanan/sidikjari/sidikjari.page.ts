import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { FingerprintAIO, FingerprintOptions } from '@awesome-cordova-plugins/fingerprint-aio/ngx';

@Component({
  selector: 'app-sidikjari',
  templateUrl: './sidikjari.page.html',
  styleUrls: ['./sidikjari.page.scss'],
  standalone: false,
})
export class SidikjariPage implements OnInit {
  // Status sidik jari (semua dihardcode karena fitur sudah dihapus)
  public fingerprintActive: boolean = false;
  public fingerprintSecurityEnabled: boolean = false;
  public isCheckingFingerprint: boolean = false;
  public isTogglingFingerprintSecurity: boolean = false;
  public deviceSupported: boolean = false;
  private users_id: string = '';
  
  // Key baru untuk security
  private readonly SECURITY_KEY = 'security';
  private readonly FINGERPRINT_VALUE = 'fingerprint_is_active';
  
  constructor(
    private alertController: AlertController,
    private http: HttpClient,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private faio: FingerprintAIO
  ) { }

  ngOnInit() {
    this.loadUserId();
    this.checkDeviceSupportSimulated();
    this.loadFingerprintStatus();
  }

  ionViewWillEnter() {
    this.loadUserId();
    this.loadFingerprintStatus();
  }

  loadUserId() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.users_id = user.users_id || user.id || '';
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }
  
  // Muat status fingerprint dari localStorage menggunakan key baru
  loadFingerprintStatus() {
    const securitySettings = localStorage.getItem(this.SECURITY_KEY);
    if (securitySettings) {
      try {
        const settings = JSON.parse(securitySettings);
        this.fingerprintActive = settings === this.FINGERPRINT_VALUE;
        this.fingerprintSecurityEnabled = this.fingerprintActive;
      } catch (e) {
        console.error('Error parsing security settings:', e);
        this.fingerprintActive = false;
        this.fingerprintSecurityEnabled = false;
      }
    } else {
      this.fingerprintActive = false;
      this.fingerprintSecurityEnabled = false;
    }
  }
  
  // Simpan status fingerprint ke localStorage menggunakan key baru
  saveFingerprintStatus(isActive: boolean) {
    if (isActive) {
      localStorage.setItem(this.SECURITY_KEY, JSON.stringify(this.FINGERPRINT_VALUE));
    } else {
      localStorage.removeItem(this.SECURITY_KEY);
    }
    this.fingerprintActive = isActive;
    this.fingerprintSecurityEnabled = isActive;
  }

  // Simulasi pengecekan dukungan perangkat (tidak lagi terhubung ke database)
  checkDeviceSupportSimulated() {
    try {
      // Cek jika ada support untuk fingerprint secara hardware      
      this.faio.isAvailable().then((result) => {
        this.deviceSupported = !!result;
        
        // Simpan ke localStorage untuk UI purposes saja
        localStorage.setItem('device_fingerprint_support', this.deviceSupported.toString());
        
        if (!this.deviceSupported) {
          this.presentAlert('Perangkat Tidak Didukung', 
            'Perangkat Anda tidak mendukung autentikasi sidik jari. Fitur ini tidak dapat diaktifkan.');
        }
      }).catch(error => {
        console.error('Fingerprint not available:', error);
        this.deviceSupported = false;
      });
    } catch (error) {
      console.error('Fingerprint check error:', error);
      this.deviceSupported = false;
    }
  }

  refreshData(event: any) {
    // Reload status fingerprint dari localStorage
    this.loadFingerprintStatus();
    
    // Selesaikan refresh
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  async toggleFingerprintSecurity(event: any) {
    const enabled = event.detail.checked;
    this.isTogglingFingerprintSecurity = true;
    
    try {
      if (enabled) {
        // Periksa apakah PIN sudah diaktifkan
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          throw new Error('User tidak ditemukan');
        }
        
        const user = JSON.parse(userStr);
        const users_id = user.users_id || user.id || '';
        
        if (!users_id) {
          throw new Error('User ID tidak ditemukan');
        }
        
        // Periksa status PIN dari server
        const pinResponse: any = await this.http.post(`${environment.apiUrl}/api/warga/keamanan/get-pin-security`, { 
          users_id 
        }).toPromise();
        
        const pinEnabled = pinResponse && pinResponse.success && pinResponse.pin_security_enabled;
        
        if (!pinEnabled) {
          // Jika PIN belum diaktifkan, tampilkan pesan dan batalkan toggle
          this.fingerprintSecurityEnabled = false;
          event.detail.checked = false;
          
          // Tampilkan alert bahwa PIN harus diaktifkan terlebih dahulu
          await this.presentAlert(
            'PIN Belum Diaktifkan', 
            'Untuk menggunakan fitur sidik jari, Anda harus mengaktifkan PIN terlebih dahulu. Silakan aktifkan PIN di menu Pengaturan PIN.'
          );
          
          // Arahkan ke halaman pengaturan PIN
          this.router.navigate(['/warga/lainnya/keamanan/pin']);
          return;
        }
        
        // Jika PIN sudah aktif, lanjutkan dengan verifikasi sidik jari
        const options: FingerprintOptions = {
          title: 'Verifikasi Sidik Jari',
          description: 'Pindai sidik jari Anda untuk mengaktifkan fitur',
          disableBackup: false,
          cancelButtonTitle: 'Batal'
        };
        
        await this.faio.show(options);
        
        // Jika berhasil, simpan status
        this.saveFingerprintStatus(true);
        this.presentToast('Sidik jari berhasil diaktifkan', 'success');
      } else {
        // Jika menonaktifkan, langsung update status
        this.saveFingerprintStatus(false);
        this.presentToast('Sidik jari berhasil dinonaktifkan', 'success');
      }
    } catch (error: any) {
      console.error('Error dalam verifikasi sidik jari:', error);
      // Jika gagal, kembalikan toggle ke posisi sebelumnya
      this.fingerprintSecurityEnabled = false;
      event.detail.checked = false;
      
      if (error === 'Fingerprint authentication canceled') {
        this.presentToast('Pengaktifan sidik jari dibatalkan', 'danger');
      } else if (error.message) {
        this.presentToast(error.message, 'danger');
      } else {
        this.presentToast('Gagal mengaktifkan sidik jari, coba lagi', 'danger');
      }
    } finally {
      this.isTogglingFingerprintSecurity = false;
    }
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

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'alert-warning'
    });

    await alert.present();
  }

  get fingerprintStatus(): string {
    return this.fingerprintActive ? 'Aktif' : 'Tidak Aktif';
  }
}
