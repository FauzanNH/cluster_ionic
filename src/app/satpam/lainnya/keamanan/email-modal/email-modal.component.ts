import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-email-modal',
  templateUrl: './email-modal.component.html',
  styleUrls: ['./email-modal.component.scss'],
  standalone: false
})
export class EmailModalComponent implements OnInit {
  emailForm: FormGroup;
  currentEmail: string = '';
  otpSent: boolean = false;
  otpForm: FormGroup;
  countdownTime: number = 0;
  countdownInterval: any;
  users_id: string = '';

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    this.emailForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.formBuilder.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit() {
    this.getCurrentEmail();
  }

  async getCurrentEmail() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.users_id = user.users_id || user.id || '';
        
        if (this.users_id) {
          const loading = await this.loadingCtrl.create({
            message: 'Memuat data...',
            spinner: 'crescent'
          });
          await loading.present();

          this.http.post<any>(`${environment.apiUrl}/api/satpam/keamanan/get-current-email`, { users_id: this.users_id })
            .subscribe({
              next: (res) => {
                loading.dismiss();
                if (res && res.success) {
                  this.currentEmail = res.email || '';
                  this.emailForm.get('email')?.setValue(this.currentEmail);
                }
              },
              error: (err) => {
                loading.dismiss();
                console.error('Error fetching email:', err);
              }
            });
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  async requestOTP() {
    if (this.emailForm.invalid) {
      return;
    }

    const email = this.emailForm.get('email')?.value;
    
    // Jika email sama dengan yang sekarang, tidak perlu update
    if (email === this.currentEmail) {
      const toast = await this.toastCtrl.create({
        message: 'Masukan Email baru.',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      toast.present();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Mengirim kode OTP...',
      spinner: 'crescent'
    });
    await loading.present();

    this.http.post<any>(`${environment.apiUrl}/api/satpam/otp-email/request`, {
      users_id: this.users_id,
      email: email
    }).subscribe({
      next: async (res) => {
        loading.dismiss();
        if (res && res.success) {
          this.otpSent = true;
          this.startCountdown();
          
          const toast = await this.toastCtrl.create({
            message: 'Kode OTP telah dikirim ke email Anda',
            duration: 3000,
            position: 'bottom',
            color: 'success'
          });
          toast.present();
        } else {
          const toast = await this.toastCtrl.create({
            message: res.message || 'Gagal mengirim OTP',
            duration: 3000,
            position: 'bottom',
            color: 'danger'
          });
          toast.present();
        }
      },
      error: async (err) => {
        loading.dismiss();
        console.error('Error requesting OTP:', err);
        
        let errorMessage = 'Gagal mengirim OTP';
        if (err.error && err.error.message) {
          errorMessage = err.error.message;
        }
        
        const toast = await this.toastCtrl.create({
          message: errorMessage,
          duration: 3000,
          position: 'bottom',
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  startCountdown() {
    this.countdownTime = 60;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    this.countdownInterval = setInterval(() => {
      this.countdownTime--;
      if (this.countdownTime <= 0) {
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }

  async verifyOTP() {
    if (this.otpForm.invalid) {
      return;
    }

    const otp = this.otpForm.get('otp')?.value;
    const email = this.emailForm.get('email')?.value;

    const loading = await this.loadingCtrl.create({
      message: 'Memverifikasi OTP...',
      spinner: 'crescent'
    });
    await loading.present();

    this.http.post<any>(`${environment.apiUrl}/api/satpam/otp-email/verify`, {
      users_id: this.users_id,
      email: email,
      otp_code: otp
    }).subscribe({
      next: async (res) => {
        loading.dismiss();
        if (res && res.success) {
          const toast = await this.toastCtrl.create({
            message: 'Email berhasil diperbarui',
            duration: 3000,
            position: 'bottom',
            color: 'success'
          });
          toast.present();
          
          // Update current email
          this.currentEmail = email;
          
          // Update user in localStorage if needed
          const userStr = localStorage.getItem('user');
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              user.email = email;
              localStorage.setItem('user', JSON.stringify(user));
            } catch (e) {
              console.error('Error updating local storage:', e);
            }
          }
          
          this.modalCtrl.dismiss({ updated: true, email: email });
        } else {
          const toast = await this.toastCtrl.create({
            message: res.message || 'Verifikasi OTP gagal',
            duration: 3000,
            position: 'bottom',
            color: 'danger'
          });
          toast.present();
        }
      },
      error: async (err) => {
        loading.dismiss();
        console.error('Error verifying OTP:', err);
        
        let errorMessage = 'Verifikasi OTP gagal';
        if (err.error && err.error.message) {
          errorMessage = err.error.message;
        }
        
        const toast = await this.toastCtrl.create({
          message: errorMessage,
          duration: 3000,
          position: 'bottom',
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  backToEmailInput() {
    this.otpSent = false;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
} 