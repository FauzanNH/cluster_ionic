import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController, ToastController } from '@ionic/angular';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-email-modal',
  templateUrl: './email-modal.component.html',
  styleUrls: ['./email-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class EmailModalComponent implements OnInit, OnDestroy {
  currentEmail: string = '';
  newEmail: string = '';
  isLoadingEmail: boolean = false;
  isUpdatingEmail: boolean = false;
  otpValues: string[] = ['', '', '', '', '', ''];
  showVerification: boolean = false;
  isRequestingOTP = false;
  isVerifyingOTP = false;
  otpRequested = false;
  isResendingOTP = false;
  
  // OTP timer dan cooldown
  public otpTimer = 0;
  public otpTimerDisplay = '';
  public resendCooldown = false;
  public cooldownTime = '';
  public resendCount = 0;
  private timerSubscription: Subscription | null = null;
  private cooldownSubscription: Subscription | null = null;

  constructor(
    private modalController: ModalController,
    private http: HttpClient,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.isLoadingEmail = true;

    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const users_id = user.users_id;
      if (users_id) {
        this.http.post(`${environment.apiUrl}/api/warga/keamanan/get-current-email`, { users_id }).subscribe({
          next: (res: any) => {
            if (res.success && res.email) {
              this.currentEmail = res.email;
            } else {
              this.currentEmail = user.email || '';
            }
            this.isLoadingEmail = false;
          },
          error: () => {
            this.currentEmail = user.email || '';
            this.isLoadingEmail = false;
          }
        });
      } else {
        this.currentEmail = user.email || '';
        this.isLoadingEmail = false;
      }
    } else {
      this.isLoadingEmail = false;
    }
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

  dismissModal() {
    this.modalController.dismiss();
  }

  updateEmail() {
    this.isUpdatingEmail = true;

    const userStr = localStorage.getItem('user');
    if (!userStr) {
      this.isUpdatingEmail = false;
      this.showAlert('Gagal', 'User tidak ditemukan di local storage');
      return;
    }
    const user = JSON.parse(userStr);
    const users_id = user.users_id;
    if (!users_id) {
      this.isUpdatingEmail = false;
      this.showAlert('Gagal', 'users_id tidak ditemukan');
      return;
    }
    this.http.post(`${environment.apiUrl}/api/warga/keamanan/update-email`, {
      users_id: users_id,
      email: this.newEmail
    }).subscribe({
      next: (res: any) => {
        this.isUpdatingEmail = false;
        if (res.success) {
          // Update localStorage jika perlu
          user.email = this.newEmail;
          localStorage.setItem('user', JSON.stringify(user));
          
          // Tampilkan toast notification
          this.presentSuccessToast();
          
          // Tutup modal setelah delay singkat
          setTimeout(() => {
    this.modalController.dismiss({
      email: this.newEmail,
      updated: true
    });
          }, 1500);
        } else {
          this.showAlert('Gagal', res.message || 'Gagal update email');
        }
      },
      error: (err) => {
        this.isUpdatingEmail = false;
        let msg = 'Gagal update email';
        if (err.error && err.error.message) msg = err.error.message;
        this.showAlert('Error', msg);
      }
    });
  }

  async presentSuccessToast(message: string = 'Email berhasil diperbarui!') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      cssClass: 'success-toast',
      color: 'success',
      animated: true,
      mode: 'ios',
      buttons: [
        {
          icon: 'checkmark-circle',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  requestOTPEmail() {
    this.isRequestingOTP = true;
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    this.http.post(`${environment.apiUrl}/api/warga/otp-email/request`, {
      users_id: user.users_id,
      email: this.newEmail
    }).subscribe({
      next: (res: any) => {
        this.isRequestingOTP = false;
        if (res.success) {
          this.otpRequested = true;
          this.showVerification = true;
          this.presentSuccessToast('Kode OTP dikirim ke email!');
          this.startOtpTimer();
        } else {
          this.showAlert('Gagal', res.message || 'Gagal mengirim OTP');
        }
      },
      error: (err) => {
        this.isRequestingOTP = false;
        if (err.status === 409 && err.error && err.error.message) {
          this.showAlert('Email Sudah Terdaftar', err.error.message);
        } else {
          this.showAlert('Error', 'Gagal mengirim OTP');
        }
      }
    });
  }
  
  // Kirim ulang OTP
  resendOTP() {
    this.resendCount++;
    
    // Kirim request OTP ulang
    this.isResendingOTP = true;
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    this.http.post(`${environment.apiUrl}/api/warga/otp-email/request`, {
      users_id: user.users_id,
      email: this.newEmail
    }).subscribe({
      next: (res: any) => {
        this.isResendingOTP = false;
        if (res.success) {
          this.presentSuccessToast('Kode OTP baru dikirim ke email!');
          
          // Reset timer OTP
          this.startOtpTimer();
          
          // Set cooldown 5 menit untuk semua request
          this.startCooldown(300);
        } else {
          this.showAlert('Gagal', res.message || 'Gagal mengirim OTP');
        }
      },
      error: (err) => {
        this.isResendingOTP = false;
        if (err.status === 409 && err.error && err.error.message) {
          this.showAlert('Email Sudah Terdaftar', err.error.message);
        } else {
          this.showAlert('Error', 'Gagal mengirim OTP');
        }
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

  verifyOTPEmail() {
    this.isVerifyingOTP = true;
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const otp_code = this.otpValues.join('');
    this.http.post(`${environment.apiUrl}/api/warga/otp-email/verify`, {
      users_id: user.users_id,
      email: this.newEmail,
      otp_code
    }).subscribe({
      next: (res: any) => {
        this.isVerifyingOTP = false;
        if (res.success) {
          // Update localStorage
          user.email = this.newEmail;
          localStorage.setItem('user', JSON.stringify(user));
          this.presentSuccessToast('Email berhasil diverifikasi!');
          
          // Bersihkan timer saat OTP valid
          if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
            this.timerSubscription = null;
          }
          if (this.cooldownSubscription) {
            this.cooldownSubscription.unsubscribe();
            this.cooldownSubscription = null;
          }
          
          setTimeout(() => {
            this.modalController.dismiss({
              email: this.newEmail,
              updated: true
            });
          }, 1500);
        } else {
          this.showAlert('Gagal', res.message || 'Kode OTP salah atau sudah kadaluarsa');
        }
      },
      error: (err) => {
        this.isVerifyingOTP = false;
        let msg = 'Gagal verifikasi OTP';
        if (err.status === 400 && err.error && err.error.message) {
          msg = err.error.message;
        } else if (err.error && err.error.message) {
          msg = err.error.message;
        }
        this.showAlert('Kode OTP Salah', msg);
      }
    });
  }

  onOtpInput(event: any, index: number) {
    let value = event.target.value;
    // Hanya ambil digit terakhir jika user paste lebih dari 1 digit
    if (value && value.length > 1) {
      value = value.slice(-1);
      this.otpValues[index] = value;
      event.target.value = value;
    }
    // Otomatis ke input berikutnya jika sudah diisi
    if (value && index < 5) {
      const nextInput = document.getElementsByName('eotp' + (index + 1))[0] as HTMLElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  onOtpKeyup(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = document.getElementsByName('eotp' + (index - 1))[0] as HTMLElement;
      if (prevInput) {
        prevInput.focus();
      }
    }
  }
} 