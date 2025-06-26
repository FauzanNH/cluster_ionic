import { Component, OnInit, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ModalController, ToastController, IonicModule, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { FingerprintAIO, FingerprintOptions } from '@awesome-cordova-plugins/fingerprint-aio/ngx';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-pin-modal',
  templateUrl: './pin-modal.component.html',
  styleUrls: ['./pin-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class PinModalComponent implements OnInit {
  @Input() routeTo?: string;
  @Input() isPinDisabled: boolean = false;
  
  public pinValues: string[] = ['', '', '', ''];
  public isVerifying: boolean = false;
  public errorMessage: string = '';
  public showError: boolean = false;
  public maxAttempts: number = 3;
  public attempts: number = 0;
  public isForgotPinMode: boolean = false;
  public hintInput: string = '';
  public newPinValues: string[] = ['', '', '', ''];
  public confirmPinValues: string[] = ['', '', '', ''];
  public actualHint: string = '';
  public isCheckingHint: boolean = false;
  public currentForgotStep: number = 1; // 1=input hint, 2=input PIN baru, 3=konfirmasi PIN
  
  // Properti untuk sidik jari
  public isFingerprintSupported: boolean = false;
  public isVerifyingFingerprint: boolean = false;
  public isFingerprintEnabled: boolean = false;
  public isFingerprintOnlyMode: boolean = false;
  
  // Key untuk localStorage
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
    console.log('PinModalComponent initialized');
    console.log('isPinDisabled:', this.isPinDisabled);
    
    this.checkFingerprintSupport();
    this.checkFingerprintEnabled();
    
    // Cek apakah ini mode sidik jari saja
    this.isFingerprintOnlyMode = this.isPinDisabled && this.isFingerprintEnabled;
    console.log('isFingerprintOnlyMode:', this.isFingerprintOnlyMode);
    console.log('isFingerprintSupported:', this.isFingerprintSupported);
    console.log('isFingerprintEnabled:', this.isFingerprintEnabled);
    
    // Jika mode sidik jari saja dan perangkat mendukung, langsung verifikasi
    if (this.isFingerprintOnlyMode && this.isFingerprintSupported) {
      console.log('Memulai verifikasi sidik jari otomatis');
      setTimeout(() => {
        this.useFingerprintAuth();
      }, 300); // Mengurangi delay menjadi 300ms
    }
    
    // Jika bukan mode sidik jari, fokus ke input PIN pertama
    if (!this.isFingerprintOnlyMode) {
      // Percepat fokus ke input pertama
      setTimeout(() => {
        const firstInput = document.getElementsByName('pin0')[0] as HTMLElement;
        if (firstInput) {
          console.log('Setting focus to first input');
          firstInput.focus();
        }
      }, 150); // Mengurangi delay menjadi 150ms
    }
  }

  ionViewDidEnter() {
    console.log('PIN Modal view entered');
    if (!this.isFingerprintOnlyMode) {
      setTimeout(() => {
        const firstInput = document.getElementsByName('pin0')[0] as HTMLElement;
        if (firstInput) {
          console.log('Setting focus in ionViewDidEnter');
          firstInput.focus();
        }
      }, 150); // Mengurangi delay menjadi 150ms
    }
  }
  
  // Periksa apakah perangkat mendukung sidik jari
  async checkFingerprintSupport() {
    try {
      const result = await this.faio.isAvailable();
      this.isFingerprintSupported = !!result;
      console.log('Fingerprint support check result:', result);
    } catch (error) {
      console.error('Fingerprint not available:', error);
      this.isFingerprintSupported = false;
    }
  }
  
  // Periksa apakah sidik jari diaktifkan di localStorage
  checkFingerprintEnabled() {
    const securitySettings = localStorage.getItem(this.SECURITY_KEY);
    console.log('Security settings from localStorage:', securitySettings);
    
    if (securitySettings) {
      try {
        // Periksa apakah nilai adalah string JSON yang di-quote atau nilai langsung
        if (securitySettings === '"fingerprint_is_active"' || securitySettings === 'fingerprint_is_active') {
          this.isFingerprintEnabled = true;
        } else {
          const settings = JSON.parse(securitySettings);
          this.isFingerprintEnabled = settings === this.FINGERPRINT_VALUE;
        }
        console.log('Fingerprint enabled parsed:', this.isFingerprintEnabled);
      } catch (e) {
        console.error('Error parsing security settings:', e);
        this.isFingerprintEnabled = false;
      }
    } else {
      this.isFingerprintEnabled = false;
    }
  }
  
  // Metode untuk menggunakan sidik jari
  async useFingerprintAuth() {
    console.log('useFingerprintAuth called');
    console.log('isFingerprintSupported:', this.isFingerprintSupported);
    console.log('isFingerprintEnabled:', this.isFingerprintEnabled);
    
    if (!this.isFingerprintSupported) {
      this.presentToast('Perangkat tidak mendukung sidik jari');
      return;
    }
    
    if (!this.isFingerprintEnabled) {
      // Jika fitur sidik jari belum diaktifkan, tampilkan opsi untuk mengaktifkan
      this.presentToast('Aktifkan fitur sidik jari di pengaturan keamanan');
      return;
    }
    
    this.isVerifyingFingerprint = true;
    
    try {
      const options: FingerprintOptions = {
        title: 'Autentikasi Sidik Jari',
        description: 'Pindai sidik jari Anda untuk login',
        disableBackup: false,
        cancelButtonTitle: 'Gunakan PIN'
      };
      
      console.log('Menampilkan dialog sidik jari');
      await this.faio.show(options);
      console.log('Autentikasi sidik jari berhasil');
      
      // Jika berhasil, simpan status sidik jari dan tutup modal
      this.isVerifyingFingerprint = false;
      this.modalCtrl.dismiss({ success: true });
      
    } catch (error) {
      console.error('Fingerprint verification error:', error);
      this.isVerifyingFingerprint = false;
      
      if (error === 'Fingerprint authentication canceled') {
        // Jika pengguna membatalkan, biarkan mereka menggunakan PIN
        console.log('Autentikasi sidik jari dibatalkan oleh pengguna');
        return;
      }
      
      this.presentToast('Anda Membatalkan Verifikasi Sidik Jari');
    }
  }
  
  // Aktifkan sidik jari setelah PIN berhasil diverifikasi
  async enableFingerprint() {
    if (!this.isFingerprintSupported) {
      this.presentToast('Perangkat tidak mendukung sidik jari');
      return;
    }
    
    try {
      const options: FingerprintOptions = {
        title: 'Aktifkan Sidik Jari',
        description: 'Pindai sidik jari Anda untuk mengaktifkan fitur',
        disableBackup: false,
        cancelButtonTitle: 'Batal'
      };
      
      await this.faio.show(options);
      
      // Jika verifikasi berhasil, aktifkan fitur di localStorage
      localStorage.setItem(this.SECURITY_KEY, JSON.stringify(this.FINGERPRINT_VALUE));
      this.isFingerprintEnabled = true;
      
      this.presentToast('Sidik jari berhasil diaktifkan', 'success');
      
      // Tutup modal
      this.modalCtrl.dismiss({ success: true, fingerprintEnabled: true });
      
    } catch (error) {
      console.error('Fingerprint activation error:', error);
      if (error !== 'Fingerprint authentication canceled') {
        this.presentToast('Gagal mengaktifkan sidik jari. Silakan coba lagi nanti.');
      }
    }
  }

  onPinInput(event: any, index: number) {
    let value = event.target.value;
    if (value && value.length > 1) {
      value = value.slice(-1);
      this.pinValues[index] = value;
      event.target.value = value;
    }
    
    // Fokus ke input berikutnya jika nilai valid
    if (value && index < 3) {
      const nextInput = document.getElementsByName('pin' + (index + 1))[0] as HTMLElement;
      if (nextInput) nextInput.focus();
    }
    
    // Auto submit jika semua digit sudah diisi
    if (index === 3 && value && !this.pinValues.includes('')) {
      this.verifyPin();
    }
  }
  
  onPinKeyup(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = document.getElementsByName('pin' + (index - 1))[0] as HTMLElement;
      if (prevInput) prevInput.focus();
    }
  }

  cancel() {
    // Tampilkan pesan toast untuk memberitahu pengguna
    this.presentToast('Menutup aplikasi...', 'success');
    
    // Beri delay sebentar agar pesan toast terlihat
    setTimeout(() => {
      // Tutup modal PIN terlebih dahulu
      this.modalCtrl.dismiss({ cancelled: true }).then(() => {
        // Tutup aplikasi dengan App dari Capacitor
        if (this.platform.is('capacitor')) {
          App.exitApp();
        }
      });
    }, 1000);
  }

  verifyPin() {
    this.hideError();
    
    if (this.pinValues.includes('')) {
      this.showErrorMessage('Masukkan 4 digit PIN');
      return;
    }

    this.isVerifying = true;
    
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
      this.showErrorMessage('User tidak ditemukan');
      this.isVerifying = false;
      return;
    }

    const pin = this.pinValues.join('');
    
    this.http.post(`${environment.apiUrl}/api/warga/keamanan/verify-pin`, {
      users_id: users_id,
      pin: pin
    }).subscribe({
      next: (res: any) => {
        this.isVerifying = false;
        if (res.success) {
          // Tandai bahwa PIN sudah diverifikasi
          localStorage.setItem('pin_verified', 'true');
          
          // Set waktu verifikasi terakhir
          localStorage.setItem('last_login_time', new Date().getTime().toString());
          
          // Jika PIN benar, langsung tutup modal tanpa pertanyaan sidik jari
          this.modalCtrl.dismiss({ success: true });
        } else {
          this.attempts++;
          if (this.attempts >= this.maxAttempts) {
            localStorage.clear();
            this.presentToast('Terlalu banyak percobaan. Silakan coba lagi nanti.', 'danger', 1000);
            this.modalCtrl.dismiss({ cancelled: true, tooManyAttempts: true }).then(() => {
              window.location.href = '/login';
            });
          } else {
            this.showErrorMessage('PIN tidak valid. Sisa percobaan: ' + (this.maxAttempts - this.attempts));
            this.resetPinValues();
            this.vibrateDevice();
          }
        }
      },
      error: (err) => {
        this.isVerifying = false;
        this.attempts++;
        if (this.attempts >= this.maxAttempts) {
          localStorage.clear();
          this.presentToast('Terlalu banyak percobaan. Silakan coba lagi nanti.', 'danger', 1000);
          this.modalCtrl.dismiss({ cancelled: true, tooManyAttempts: true }).then(() => {
            window.location.href = '/login';
          });
        } else {
          this.showErrorMessage(err.error?.message || 'PIN tidak valid. Sisa percobaan: ' + (this.maxAttempts - this.attempts));
          this.resetPinValues();
          this.vibrateDevice();
        }
      }
    });
  }

  resetPinValues() {
    this.pinValues = ['', '', '', ''];
    setTimeout(() => {
      const firstInput = document.getElementsByName('pin0')[0] as HTMLElement;
      if (firstInput) firstInput.focus();
    }, 300);
  }

  showErrorMessage(message: string) {
    this.errorMessage = message;
    this.showError = true;
    this.vibrateDevice();
  }

  hideError() {
    this.showError = false;
    this.errorMessage = '';
  }

  async vibrateDevice() {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      setTimeout(async () => {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }, 100);
    } catch (error) {
      console.error('Error activating haptics:', error);
    }
  }

  async presentToast(message: string, color: string = 'danger', duration: number = 3000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      position: 'bottom',
      color: color
    });
    await toast.present();
    if (color === 'danger') {
      this.vibrateDevice();
    }
  }

  showForgotPinForm() {
    this.isForgotPinMode = true;
    this.currentForgotStep = 1;
    this.errorMessage = '';
    this.showError = false;
  }

  verifyHint() {
    this.hideError();
    
    if (!this.hintInput || this.hintInput.trim().length < 3) {
      this.showErrorMessage('Masukkan hint minimal 3 karakter');
      this.vibrateDevice();
      return;
    }

    this.isCheckingHint = true;
    
    const userStr = localStorage.getItem('user');
    let users_id = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        users_id = user.users_id || user.id || '';
      } catch (e) {}
    }
    
    if (!users_id) {
      this.showErrorMessage('User tidak ditemukan');
      this.vibrateDevice();
      this.isCheckingHint = false;
      return;
    }

    this.http.post(`${environment.apiUrl}/api/warga/keamanan/verify-hint`, {
      users_id: users_id,
      hint: this.hintInput
    }).subscribe({
      next: (res: any) => {
        this.isCheckingHint = false;
        if (res.success) {
          this.actualHint = res.hint;
          this.currentForgotStep = 2;
        } else {
          this.showErrorMessage(res.message || 'Hint tidak valid');
          this.vibrateDevice();
        }
      },
      error: (err) => {
        this.isCheckingHint = false;
        this.showErrorMessage(err.error?.message || 'Terjadi kesalahan saat memeriksa hint');
        this.vibrateDevice();
      }
    });
  }

  resetPin() {
    this.hideError();
    
    const newPin = this.newPinValues.join('');
    const confirmPin = this.confirmPinValues.join('');
    
    if (newPin !== confirmPin) {
      this.showErrorMessage('PIN konfirmasi tidak cocok');
      this.vibrateDevice();
      return;
    }
    
    this.isVerifying = true;
    
    const userStr = localStorage.getItem('user');
    let users_id = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        users_id = user.users_id || user.id || '';
      } catch (e) {}
    }
    
    if (!users_id) {
      this.showErrorMessage('User tidak ditemukan');
      this.vibrateDevice();
      this.isVerifying = false;
      return;
    }

    this.http.post(`${environment.apiUrl}/api/warga/keamanan/reset-pin`, {
      users_id: users_id,
      new_pin: newPin,
      hint: this.actualHint
    }).subscribe({
      next: (res: any) => {
        this.isVerifying = false;
        if (res.success) {
          this.presentToast('PIN berhasil diubah', 'success');
          
          // Reset fingerprint jika diaktifkan
          if (this.isFingerprintEnabled) {
            localStorage.removeItem(this.SECURITY_KEY);
            this.isFingerprintEnabled = false;
          }
          
          this.modalCtrl.dismiss({ success: true });
        } else {
          this.showErrorMessage(res.message || 'Gagal mengubah PIN');
          this.vibrateDevice();
        }
      },
      error: (err) => {
        this.isVerifying = false;
        this.showErrorMessage(err.error?.message || 'Terjadi kesalahan saat mengubah PIN');
        this.vibrateDevice();
      }
    });
  }

  onForgotPinInput(event: any, index: number, type: 'new' | 'confirm') {
    let value = event.target.value;
    if (value && value.length > 1) {
      value = value.slice(-1);
      if (type === 'new') {
        this.newPinValues[index] = value;
      } else {
        this.confirmPinValues[index] = value;
      }
      event.target.value = value;
    }
    
    if (value && index < 3) {
      const nextInput = document.getElementsByName(type + 'Pin' + (index + 1))[0] as HTMLElement;
      if (nextInput) nextInput.focus();
    }
    
    if (type === 'new' && index === 3 && this.newPinValues.every(v => v !== '')) {
      setTimeout(() => {
        const firstConfirmInput = document.getElementsByName('confirmPin0')[0] as HTMLElement;
        if (firstConfirmInput) firstConfirmInput.focus();
      }, 300);
    }
  }

  onForgotPinKeyup(event: KeyboardEvent, index: number, type: 'new' | 'confirm') {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = document.getElementsByName(type + 'Pin' + (index - 1))[0] as HTMLElement;
      if (prevInput) prevInput.focus();
    }
  }

  goToConfirmPin() {
    this.hideError();
    if (this.newPinValues.includes('')) {
      this.showErrorMessage('Masukkan 4 digit PIN baru');
      return;
    }
    this.currentForgotStep = 3;
  }

  closeForgotPin() {
    this.isForgotPinMode = false;
    this.currentForgotStep = 1;
    this.hintInput = '';
    this.newPinValues = ['', '', '', ''];
    this.confirmPinValues = ['', '', '', ''];
    this.hideError();
  }
} 