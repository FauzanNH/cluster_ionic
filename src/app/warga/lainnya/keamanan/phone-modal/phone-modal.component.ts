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
  selector: 'app-phone-modal',
  templateUrl: './phone-modal.component.html',
  styleUrls: ['./phone-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PhoneModalComponent implements OnInit, OnDestroy {
  // Data
  currentPhoneNumber: string = '';
  newPhoneNumber: string = '';
  isVerified: boolean = true;
  
  // OTP verification
  showVerification: boolean = false;
  otpValues: string[] = ['', '', '', '', '', ''];
  
  // Loading states
  isLoadingPhone: boolean = false;
  isUpdatingPhone: boolean = false;
  
  isRequestingOTP = false;
  otpRequested = false;
  
  isVerifyingOTP = false;
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
    this.getCurrentPhone();
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

  // Dismiss the modal
  dismissModal() {
    this.modalController.dismiss();
  }

  // Get current phone from API
  getCurrentPhone() {
    this.isLoadingPhone = true;
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const users_id = user.users_id;
      
      if (users_id) {
        this.http.post(`${environment.apiUrl}/api/warga/keamanan/get-current-phone`, { users_id }).subscribe({
          next: (res: any) => {
            if (res.success && res.no_hp) {
              this.currentPhoneNumber = res.no_hp;
            } else {
              this.currentPhoneNumber = user.no_hp || '';
            }
            this.isLoadingPhone = false;
          },
          error: () => {
            this.currentPhoneNumber = user.no_hp || '';
            this.isLoadingPhone = false;
          }
        });
      } else {
        this.currentPhoneNumber = user.no_hp || '';
        this.isLoadingPhone = false;
      }
    } else {
      this.isLoadingPhone = false;
    }
  }

  // Request OTP for verification
  requestOTP() {
    this.isRequestingOTP = true;
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    this.http.post(`${environment.apiUrl}/api/warga/otp/request`, {
      users_id: user.users_id,
      no_hp: this.newPhoneNumber
    }).subscribe({
      next: (res: any) => {
        this.isRequestingOTP = false;
        if (res.success) {
          this.otpRequested = true;
          this.showVerification = true;
          this.presentSuccessToast('OTP berhasil dikirim ke WhatsApp');
          this.startOtpTimer();
        } else {
          this.showAlert('Gagal', res.message || 'Gagal mengirim OTP');
        }
      },
      error: (err) => {
        this.isRequestingOTP = false;
        if (err.status === 409 && err.error && err.error.message) {
          this.showAlert('Nomor Sudah Terdaftar', err.error.message);
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
    this.http.post(`${environment.apiUrl}/api/warga/otp/request`, {
      users_id: user.users_id,
      no_hp: this.newPhoneNumber
    }).subscribe({
      next: (res: any) => {
        this.isResendingOTP = false;
        if (res.success) {
          this.presentSuccessToast('OTP baru berhasil dikirim ke WhatsApp');
          
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
          this.showAlert('Nomor Sudah Terdaftar', err.error.message);
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

  // Handle OTP input
  onOtpChange(value: string, index: number) {
    // Handle OTP input and auto-focus to next input
    this.otpValues[index] = value;
    
    // Auto focus to next input
    if (value && index < 5) {
      const nextInput = document.querySelectorAll('.otp-input')[index + 1] as HTMLElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  // Verify OTP and update phone number
  verifyOTP() {
    this.isVerifyingOTP = true;
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const otp_code = this.otpValues.join('');
    this.http.post(`${environment.apiUrl}/api/warga/otp/verify`, {
      users_id: user.users_id,
      no_hp: this.newPhoneNumber,
      otp_code
    }).subscribe({
      next: (res: any) => {
        this.isVerifyingOTP = false;
        if (res.success) {
          // Update localStorage
          user.no_hp = this.newPhoneNumber;
          localStorage.setItem('user', JSON.stringify(user));
          // Show success toast
          this.presentSuccessToast();
          
          // Bersihkan timer saat OTP valid
          if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
            this.timerSubscription = null;
          }
          if (this.cooldownSubscription) {
            this.cooldownSubscription.unsubscribe();
            this.cooldownSubscription = null;
          }
          
          // Close modal after delay
          setTimeout(() => {
            this.modalController.dismiss({
              phone: this.newPhoneNumber,
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
          msg = err.error.message; // Pesan dari backend: OTP tidak valid atau sudah kadaluarsa
        } else if (err.error && err.error.message) {
          msg = err.error.message;
        }
        this.showAlert('Kode OTP Salah', msg);
      }
    });
  }
  
  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async presentSuccessToast(message: string = 'Nomor HP berhasil diperbarui!') {
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
      const nextInput = document.getElementsByName('otp' + (index + 1))[0] as HTMLElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  onOtpKeyup(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = document.getElementsByName('otp' + (index - 1))[0] as HTMLElement;
      if (prevInput) {
        prevInput.focus();
      }
    }
  }
} 