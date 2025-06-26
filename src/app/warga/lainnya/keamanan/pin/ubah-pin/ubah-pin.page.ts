import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ubah-pin',
  templateUrl: './ubah-pin.page.html',
  styleUrls: ['./ubah-pin.page.scss'],
  standalone: false,
})
export class UbahPinPage implements OnInit {
  public oldPinValues: string[] = ['', '', '', ''];
  public newPinValues: string[] = ['', '', '', ''];
  public confirmPinValues: string[] = ['', '', '', ''];
  public currentStep: number = 1;
  public isUpdatingPin: boolean = false;

  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    // Reset state when entering the page
    this.oldPinValues = ['', '', '', ''];
    this.newPinValues = ['', '', '', ''];
    this.confirmPinValues = ['', '', '', ''];
    this.currentStep = 1;
    this.isUpdatingPin = false;
  }

  onBack() {
    this.router.navigate(['/warga/lainnya/keamanan']);
  }

  async presentSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  async presentErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
      cssClass: 'error-toast',
      buttons: [
        {
          icon: 'close-circle',
          role: 'cancel'
        }
      ]
    });
    
    await toast.present();
    
    toast.addEventListener('ionToastWillDismiss', () => {
      const toastEl = document.querySelector('.error-toast');
      if (toastEl) {
        toastEl.classList.add('toast-hidden');
      }
    });
  }

  // PIN input handler dengan tipe PIN (old, new, confirm)
  onPinInput(event: any, index: number, pinType: 'old' | 'new' | 'confirm') {
    let value = event.target.value;
    
    if (value && value.length > 1) {
      value = value.slice(-1);
      if (pinType === 'old') {
        this.oldPinValues[index] = value;
      } else if (pinType === 'new') {
        this.newPinValues[index] = value;
      } else {
        this.confirmPinValues[index] = value;
      }
      event.target.value = value;
    }
    
    // Fokus ke input berikutnya jika nilai valid
    if (value && index < 3) {
      const nextInput = document.getElementsByName(pinType + 'Pin' + (index + 1))[0] as HTMLElement;
      if (nextInput) nextInput.focus();
    }
    
    // Auto-focus untuk setiap step
    const isPinComplete = (pinArray: string[]) => pinArray.every(val => val !== '');
    
    if (pinType === 'old' && index === 3 && isPinComplete(this.oldPinValues)) {
      setTimeout(() => {
        // Tidak pindah step otomatis, user harus klik tombol lanjutkan
      }, 300);
    }
    
    if (pinType === 'new' && index === 3 && isPinComplete(this.newPinValues)) {
      setTimeout(() => {
        // Tidak pindah step otomatis, user harus klik tombol lanjutkan
      }, 300);
    }
    
    if (pinType === 'confirm' && index === 3 && isPinComplete(this.confirmPinValues)) {
      setTimeout(() => {
        // Tidak otomatis submit, user harus klik tombol perbarui PIN
      }, 300);
    }
  }
  
  onPinKeyup(event: KeyboardEvent, index: number, pinType: 'old' | 'new' | 'confirm') {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = document.getElementsByName(pinType + 'Pin' + (index - 1))[0] as HTMLElement;
      if (prevInput) prevInput.focus();
    }
  }

  verifyOldPin() {
    const oldPin = this.oldPinValues.join('');
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
      this.presentErrorToast('User tidak ditemukan');
      return;
    }
    this.isUpdatingPin = true;
    // Panggil API untuk verifikasi PIN lama
    this.http.post(`${environment.apiUrl}/api/warga/keamanan/verify-pin`, {
      users_id: users_id,
      pin: oldPin
    }).subscribe({
      next: (res: any) => {
        this.isUpdatingPin = false;
        if (res.success) {
          this.presentSuccessToast('PIN lama berhasil diverifikasi');
          this.currentStep = 2; // Lanjut ke PIN baru
          setTimeout(() => {
            const firstNewPinInput = document.getElementsByName('newPin0')[0] as HTMLElement;
            if (firstNewPinInput) firstNewPinInput.focus();
          }, 300);
        } else {
          this.presentErrorToast(res.message || 'PIN lama tidak valid');
        }
      },
      error: (err) => {
        this.isUpdatingPin = false;
        this.presentErrorToast(err.error?.message || 'PIN lama tidak valid');
      }
    });
  }

  updatePin() {
    const newPin = this.newPinValues.join('');
    const confirmPin = this.confirmPinValues.join('');
    if (newPin !== confirmPin) {
      this.presentErrorToast('PIN konfirmasi tidak cocok');
      this.currentStep = 2;
      return;
    }
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
      this.presentErrorToast('User tidak ditemukan');
      return;
    }
    const oldPin = this.oldPinValues.join('');
    this.isUpdatingPin = true;
    this.http.post(`${environment.apiUrl}/api/warga/keamanan/update-pin`, {
      users_id: users_id,
      old_pin: oldPin,
      new_pin: newPin
    }).subscribe({
      next: (res: any) => {
        this.isUpdatingPin = false;
        if (res.success) {
          this.presentSuccessToast('PIN berhasil diperbarui!');
          setTimeout(() => {
            this.router.navigate(['/warga/lainnya/keamanan']);
          }, 1000);
        } else {
          this.presentErrorToast(res.message || 'Gagal memperbarui PIN');
        }
      },
      error: (err) => {
        this.isUpdatingPin = false;
        this.presentErrorToast(err.error?.message || 'Gagal memperbarui PIN');
      }
    });
  }
}
