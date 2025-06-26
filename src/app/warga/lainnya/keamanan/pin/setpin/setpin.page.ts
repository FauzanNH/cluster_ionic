import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-setpin',
  templateUrl: './setpin.page.html',
  styleUrls: ['./setpin.page.scss'],
  standalone: false,
})
export class SetpinPage implements OnInit {
  public pinValues: string[] = ['', '', '', ''];
  public confirmPinValues: string[] = ['', '', '', ''];
  public currentStep: number = 1;
  public isSavingPin: boolean = false;
  public hint: string = '';

  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    // Optional: bisa dipakai jika ingin handle back hardware juga
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

  // PIN input auto next
  onPinInput(event: any, index: number, isConfirmStep: boolean = false) {
    let value = event.target.value;
    if (value && value.length > 1) {
      value = value.slice(-1);
      if (isConfirmStep) {
        this.confirmPinValues[index] = value;
      } else {
        this.pinValues[index] = value;
      }
      event.target.value = value;
    }
    
    if (value && index < 3) {
      const nextInput = document.getElementsByName((isConfirmStep ? 'confirmPin' : 'pin') + (index + 1))[0] as HTMLElement;
      if (nextInput) nextInput.focus();
    }
    
    // Step ke-2: Konfirmasi PIN
    if (!isConfirmStep && index === 3 && this.pinValues.every(val => val !== '')) {
      setTimeout(() => {
        this.currentStep = 2;
        setTimeout(() => {
          const firstConfirmInput = document.getElementsByName('confirmPin0')[0] as HTMLElement;
          if (firstConfirmInput) firstConfirmInput.focus();
        }, 300);
      }, 300);
    }
    // Step ke-3: Input hint
    if (isConfirmStep && index === 3 && this.confirmPinValues.every(val => val !== '')) {
      setTimeout(() => {
        this.currentStep = 3;
        setTimeout(() => {
          const hintInput = document.getElementById('hint') as HTMLElement;
          if (hintInput) hintInput.focus();
        }, 300);
      }, 300);
    }
  }
  
  onPinKeyup(event: KeyboardEvent, index: number, isConfirmStep: boolean = false) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = document.getElementsByName((isConfirmStep ? 'confirmPin' : 'pin') + (index - 1))[0] as HTMLElement;
      if (prevInput) prevInput.focus();
    }
  }

  savePin() {
    const pin = this.pinValues.join('');
    const confirmPin = this.confirmPinValues.join('');
    
    if (pin !== confirmPin) {
      this.presentErrorToast('PIN konfirmasi tidak cocok');
      this.currentStep = 2;
      return;
    }
    if (!this.hint || this.hint.trim().length < 3) {
      this.presentErrorToast('Hint minimal 3 karakter');
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

    this.isSavingPin = true;
    
    this.http.post(`${environment.apiUrl}/api/warga/keamanan/set-pin`, {
      users_id: users_id,
      pin: pin,
      hint: this.hint
    }).subscribe({
      next: (res: any) => {
        this.isSavingPin = false;
        if (res.success) {
          this.presentSuccessToast('PIN berhasil disimpan!');
          setTimeout(() => {
            this.router.navigate(['/warga/lainnya/keamanan']);
          }, 1000);
        } else {
          this.presentErrorToast(res.message || 'Gagal menyimpan PIN');
        }
      },
      error: (err) => {
        this.isSavingPin = false;
        this.presentErrorToast(err.error?.message || 'Gagal menyimpan PIN');
      }
    });
  }
}
