import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-phone-modal',
  templateUrl: './phone-modal.component.html',
  styleUrls: ['./phone-modal.component.scss'],
  standalone: false
})
export class PhoneModalComponent implements OnInit {
  phoneForm: FormGroup;
  currentPhone: string = '';
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
    this.phoneForm = this.formBuilder.group({
      phone: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(15)]]
    });

    this.otpForm = this.formBuilder.group({
      otp: ['', [
        Validators.required, 
        Validators.minLength(6), 
        Validators.maxLength(6),
        Validators.pattern(/^\d{6}$/)
      ]]
    });
  }

  ngOnInit() {
    this.getCurrentPhone();
  }

  async getCurrentPhone() {
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

          this.http.post<any>(`${environment.apiUrl}/api/satpam/keamanan/get-current-phone`, { users_id: this.users_id })
            .subscribe({
              next: (res) => {
                loading.dismiss();
                if (res && res.success) {
                  this.currentPhone = res.no_hp || '';
                  this.phoneForm.get('phone')?.setValue(this.currentPhone);
                }
              },
              error: (err) => {
                loading.dismiss();
                console.error('Error fetching phone:', err);
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
    if (this.phoneForm.invalid) {
      return;
    }

    const phone = this.phoneForm.get('phone')?.value;
    
    // Tambahkan log untuk debugging
    console.log('Requesting OTP with data:', {
      users_id: this.users_id,
      no_hp: phone
    });
    
    // Jika nomor sama dengan yang sekarang, tidak perlu update
    if (phone === this.currentPhone) {
      const toast = await this.toastCtrl.create({
        message: 'Nomor HP sama dengan yang sekarang. Tidak perlu diupdate.',
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

    this.http.post<any>(`${environment.apiUrl}/api/satpam/otp/request`, {
      users_id: this.users_id,
      no_hp: phone
    }).subscribe({
      next: async (res) => {
        loading.dismiss();
        console.log('OTP request response:', res);
        
        if (res && res.success) {
          this.otpSent = true;
          this.startCountdown();
          
          const toast = await this.toastCtrl.create({
            message: 'Kode OTP telah dikirim ke WhatsApp Anda',
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
        
        // Tambahkan detail error untuk debugging
        if (err.error && err.error.errors) {
          console.error('Validation errors:', err.error.errors);
          
          // Cek validasi spesifik untuk setiap field
          if (err.error.errors.no_hp) {
            errorMessage = `Nomor HP: ${err.error.errors.no_hp.join(', ')}`;
          } else if (err.error.errors.users_id) {
            errorMessage = `User ID: ${err.error.errors.users_id.join(', ')}`;
          }
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
    const otp = this.otpForm.get('otp')?.value;
    const phone = this.phoneForm.get('phone')?.value;
    
    console.log('OTP value:', otp, 'type:', typeof otp, 'length:', otp ? otp.toString().length : 0);
    
    // Validasi form sebelum submit
    if (!otp) {
      const toast = await this.toastCtrl.create({
        message: 'Kode OTP tidak boleh kosong',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      toast.present();
      return;
    }
    
    // Convert OTP ke string dan validasi panjangnya
    const otpString = otp.toString();
    console.log('OTP string:', otpString, 'length:', otpString.length);
    
    if (otpString.length !== 6) {
      const toast = await this.toastCtrl.create({
        message: `Kode OTP harus 6 digit (saat ini ${otpString.length} digit)`,
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      toast.present();
      return;
    }

    // Pastikan nomor HP valid
    if (!phone || phone.length < 10) {
      const toast = await this.toastCtrl.create({
        message: 'Nomor HP tidak valid',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      toast.present();
      return;
    }

    // Tambahkan log untuk debugging
    console.log('Verifying OTP with data:', {
      users_id: this.users_id,
      no_hp: phone,
      otp_code: otpString
    });

    const loading = await this.loadingCtrl.create({
      message: 'Memverifikasi OTP...',
      spinner: 'crescent'
    });
    await loading.present();

    const payload = {
      users_id: this.users_id,
      no_hp: phone,
      otp_code: otpString
    };
    
    console.log('Sending payload:', payload);

    this.http.post<any>(`${environment.apiUrl}/api/satpam/otp/verify`, payload)
      .subscribe({
        next: async (res) => {
          loading.dismiss();
          console.log('OTP verification response:', res);
          
          if (res && res.success) {
            const toast = await this.toastCtrl.create({
              message: 'Nomor HP berhasil diperbarui',
              duration: 3000,
              position: 'bottom',
              color: 'success'
            });
            toast.present();
            
            // Update current phone
            this.currentPhone = phone;
            
            // Update user in localStorage if needed
            const userStr = localStorage.getItem('user');
            if (userStr) {
              try {
                const user = JSON.parse(userStr);
                user.no_hp = phone;
                localStorage.setItem('user', JSON.stringify(user));
              } catch (e) {
                console.error('Error updating local storage:', e);
              }
            }
            
            this.modalCtrl.dismiss({ updated: true, phone: phone });
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
          
          // Tambahkan detail error untuk debugging
          if (err.error && err.error.errors) {
            console.error('Validation errors:', err.error.errors);
            
            // Cek validasi spesifik untuk setiap field
            if (err.error.errors.otp_code) {
              errorMessage = `Kode OTP: ${err.error.errors.otp_code.join(', ')}`;
            } else if (err.error.errors.no_hp) {
              errorMessage = `Nomor HP: ${err.error.errors.no_hp.join(', ')}`;
            } else if (err.error.errors.users_id) {
              errorMessage = `User ID: ${err.error.errors.users_id.join(', ')}`;
            }
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

  backToPhoneInput() {
    this.otpSent = false;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
} 