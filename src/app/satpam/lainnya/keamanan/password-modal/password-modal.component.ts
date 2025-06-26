import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, LoadingController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-password-modal',
  templateUrl: './password-modal.component.html',
  styleUrls: ['./password-modal.component.scss'],
  standalone: false
})
export class PasswordModalComponent implements OnInit {
  passwordForm: FormGroup;
  users_id: string = '';
  showCurrentPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    this.passwordForm = this.formBuilder.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit() {
    this.getUserId();
  }

  getUserId() {
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

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (newPassword !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ notMatching: true });
      return { notMatching: true };
    }
    
    return null;
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  togglePasswordVisibility(field: string) {
    if (field === 'current') {
      this.showCurrentPassword = !this.showCurrentPassword;
    } else if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
    } else if (field === 'confirm') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  async updatePassword() {
    if (this.passwordForm.invalid) {
      return;
    }

    const currentPassword = this.passwordForm.get('currentPassword')?.value;
    const newPassword = this.passwordForm.get('newPassword')?.value;
    const confirmPassword = this.passwordForm.get('confirmPassword')?.value;

    const loading = await this.loadingCtrl.create({
      message: 'Memperbarui password...',
      spinner: 'crescent'
    });
    await loading.present();

    this.http.post<any>(`${environment.apiUrl}/api/satpam/keamanan/update-password`, {
      users_id: this.users_id,
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    }).subscribe({
      next: async (res) => {
        loading.dismiss();
        if (res && res.success) {
          console.log('Password update successful, response:', res);
          
          // Jika ada token baru, simpan ke localStorage untuk mencegah logout
          if (res.token) {
            console.log('New token received, updating localStorage');
            localStorage.setItem('token', res.token);
            localStorage.setItem('token_type', res.token_type || 'bearer');
            
            // Hitung waktu kedaluwarsa token dan simpan
            const expiresAt = Date.now() + (res.expires_in * 1000);
            localStorage.setItem('token_expires', expiresAt.toString());
            console.log('Token updated in localStorage, expires at:', new Date(expiresAt));
          } else {
            console.log('No new token in response');
          }
          
          const toast = await this.toastCtrl.create({
            message: 'Password berhasil diperbarui',
            duration: 3000,
            position: 'bottom',
            color: 'success'
          });
          toast.present();
          
          // Delay sebentar sebelum dismiss modal
          setTimeout(() => {
            this.modalCtrl.dismiss({ updated: true });
          }, 500);
        } else {
          console.error('Password update response unsuccessful:', res);
          const toast = await this.toastCtrl.create({
            message: res.message || 'Gagal memperbarui password',
            duration: 3000,
            position: 'bottom',
            color: 'danger'
          });
          toast.present();
        }
      },
      error: async (err) => {
        loading.dismiss();
        console.error('Error updating password:', err);
        
        let errorMessage = 'Gagal memperbarui password';
        
        // Cek jika error adalah password lama tidak sesuai
        if (err.status === 401 || err.status === 422) {
          if (err.error && err.error.message) {
            errorMessage = err.error.message;
          } else {
            errorMessage = 'Password saat ini tidak sesuai';
          }
        } else if (err.error && err.error.message) {
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
} 