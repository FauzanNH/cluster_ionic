import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController, ToastController } from '@ionic/angular';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-lupapassword',
  templateUrl: './lupapassword.page.html',
  styleUrls: ['./lupapassword.page.scss'],
  standalone: false,
})
export class LupapasswordPage implements OnInit, OnDestroy {

  public currentStep: number = 1;
  public email: string = '';
  public otpValues: string[] = ['', '', '', '', '', ''];
  public isRequestingOTP = false;
  public isVerifyingOTP = false;
  public isResettingPassword = false;
  public isResendingOTP = false;
  public users_id: string = '';
  public newPassword: string = '';
  public confirmPassword: string = '';

  // OTP timer dan cooldown
  public otpTimer = 0;
  public otpTimerDisplay = '';
  public resendCooldown = false;
  public cooldownTime = '';
  public resendCount = 0;
  private timerSubscription: Subscription | null = null;
  private cooldownSubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
  }

  ngOnDestroy() {
    // Bersihkan subscription untuk mencegah memory leak
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.cooldownSubscription) {
      this.cooldownSubscription.unsubscribe();
    }
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
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
    
    // Tambahkan animasi slide out ke kanan saat toast di-dismiss
    toast.addEventListener('ionToastWillDismiss', () => {
      const toastEl = document.querySelector('.error-toast');
      if (toastEl) {
        toastEl.classList.add('toast-hidden');
      }
    });
  }

  // Step 1: Request OTP
  requestOTP() {
    this.isRequestingOTP = true;
    this.http.post(`${environment.apiUrl}/api/warga/otp-email/request-reset-password`, {
      email: this.email
    }).subscribe({
      next: (res: any) => {
        this.isRequestingOTP = false;
        if (res.success) {
          this.presentSuccessToast('Kode OTP dikirim ke email!');
          this.currentStep = 2;
          this.startOtpTimer();
        } else {
          this.presentErrorToast(res.message || 'Gagal mengirim OTP');
        }
      },
      error: (err) => {
        this.isRequestingOTP = false;
        if (err.status === 422) {
          this.presentErrorToast('Eror: Email tidak ditemukan');
        } else {
          this.presentErrorToast(err.error?.message || 'Gagal mengirim OTP');
        }
      }
    });
  }

  // Kirim ulang OTP
  resendOTP() {
    this.resendCount++;
    
    // Kirim request OTP ulang
    this.isResendingOTP = true;
    this.http.post(`${environment.apiUrl}/api/warga/otp-email/request-reset-password`, {
      email: this.email
    }).subscribe({
      next: (res: any) => {
        this.isResendingOTP = false;
        if (res.success) {
          this.presentSuccessToast('Kode OTP baru dikirim ke email!');
          
          // Reset timer OTP
          this.startOtpTimer();
          
          // Set cooldown berdasarkan jumlah request
          if (this.resendCount === 1) {
            // Cooldown 1 menit untuk request pertama
            this.startCooldown(60);
          } else {
            // Cooldown 5 menit untuk request kedua dan seterusnya
            this.startCooldown(300);
          }
        } else {
          this.presentErrorToast(res.message || 'Gagal mengirim OTP');
        }
      },
      error: (err) => {
        this.isResendingOTP = false;
        this.presentErrorToast(err.error?.message || 'Gagal mengirim OTP');
      }
    });
  }

  // Timer untuk OTP (5 menit)
  startOtpTimer() {
    // Bersihkan timer sebelumnya jika ada
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    
    // Set timer 5 menit (300 detik)
    this.otpTimer = 300;
    this.updateOtpTimerDisplay();
    
    // Update timer setiap detik
    this.timerSubscription = interval(1000).subscribe(() => {
      this.otpTimer--;
      this.updateOtpTimerDisplay();
      
      if (this.otpTimer <= 0) {
        if (this.timerSubscription) {
          this.timerSubscription.unsubscribe();
          this.timerSubscription = null;
        }
      }
    });
  }

  // Format tampilan timer OTP
  updateOtpTimerDisplay() {
    const minutes = Math.floor(this.otpTimer / 60);
    const seconds = this.otpTimer % 60;
    this.otpTimerDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Timer untuk cooldown kirim ulang
  startCooldown(seconds: number) {
    // Aktifkan cooldown
    this.resendCooldown = true;
    let cooldownTimer = seconds;
    
    // Bersihkan cooldown sebelumnya jika ada
    if (this.cooldownSubscription) {
      this.cooldownSubscription.unsubscribe();
    }
    
    // Update cooldown text
    this.updateCooldownDisplay(cooldownTimer);
    
    // Update cooldown setiap detik
    this.cooldownSubscription = interval(1000).subscribe(() => {
      cooldownTimer--;
      this.updateCooldownDisplay(cooldownTimer);
      
      if (cooldownTimer <= 0) {
        this.resendCooldown = false;
        if (this.cooldownSubscription) {
          this.cooldownSubscription.unsubscribe();
          this.cooldownSubscription = null;
        }
      }
    });
  }

  // Format tampilan cooldown
  updateCooldownDisplay(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    this.cooldownTime = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Step 2: Verifikasi OTP
  verifyOTP() {
    this.isVerifyingOTP = true;
    const otp_code = this.otpValues.join('');
    this.http.post(`${environment.apiUrl}/api/warga/otp-email/verify-reset-password`, {
      email: this.email,
      otp_code
    }).subscribe({
      next: (res: any) => {
        this.isVerifyingOTP = false;
        if (res.success) {
          this.users_id = res.users_id;
          this.presentSuccessToast('OTP valid, silakan buat password baru!');
          this.currentStep = 3;
          
          // Bersihkan timer saat OTP valid
          if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
            this.timerSubscription = null;
          }
          if (this.cooldownSubscription) {
            this.cooldownSubscription.unsubscribe();
            this.cooldownSubscription = null;
          }
        } else {
          this.presentErrorToast(res.message || 'Kode OTP salah atau kadaluarsa');
        }
      },
      error: (err) => {
        this.isVerifyingOTP = false;
        this.presentErrorToast(err.error?.message || 'Gagal verifikasi OTP');
      }
    });
  }

  // Step 3: Reset Password
  resetPassword() {
    if (!this.newPassword || this.newPassword.length < 8) {
      this.presentErrorToast('Password minimal 8 karakter');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.presentErrorToast('Konfirmasi password tidak sama');
      return;
    }
    this.isResettingPassword = true;
    this.http.post(`${environment.apiUrl}/api/warga/keamanan/update-password`, {
      users_id: this.users_id,
      current_password: '-', // backend abaikan jika reset password
      new_password: this.newPassword,
      confirm_password: this.confirmPassword
    }).subscribe({
      next: (res: any) => {
        this.isResettingPassword = false;
        if (res.success) {
          this.presentSuccessToast('Password berhasil direset!');
          this.currentStep = 1;
          // redirect ke login jika perlu
        } else {
          this.presentErrorToast(res.message || 'Gagal reset password');
        }
      },
      error: (err) => {
        this.isResettingPassword = false;
        this.presentErrorToast(err.error?.message || 'Gagal reset password');
      }
    });
  }

  // OTP input auto next
  onOtpInput(event: any, index: number) {
    let value = event.target.value;
    if (value && value.length > 1) {
      value = value.slice(-1);
      this.otpValues[index] = value;
      event.target.value = value;
    }
    if (value && index < 5) {
      const nextInput = document.getElementsByName('otp' + (index + 1))[0] as HTMLElement;
      if (nextInput) nextInput.focus();
    }
  }
  onOtpKeyup(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = document.getElementsByName('otp' + (index - 1))[0] as HTMLElement;
      if (prevInput) prevInput.focus();
    }
  }
}
