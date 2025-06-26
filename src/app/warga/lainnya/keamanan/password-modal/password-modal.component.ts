import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController, ToastController } from '@ionic/angular';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-password-modal',
  templateUrl: './password-modal.component.html',
  styleUrls: ['./password-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class PasswordModalComponent implements OnInit {
  passwordForm: FormGroup;
  isSubmitted = false;
  isUpdating = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  users_id: string = '';

  constructor(
    private modalController: ModalController,
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingCtrl: LoadingController
  ) {
    this.passwordForm = this.formBuilder.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, {
      validator: this.passwordMatchValidator
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

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
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

  dismissModal() {
    this.modalController.dismiss();
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

    this.http.post<any>(`${environment.apiUrl}/api/warga/keamanan/update-password`, {
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
          
          const toast = await this.toastController.create({
            message: 'Password berhasil diperbarui',
            duration: 3000,
            position: 'bottom',
            color: 'success'
          });
          toast.present();
          
          // Delay sebentar sebelum dismiss modal
          setTimeout(() => {
            this.modalController.dismiss({ updated: true });
          }, 500);
        } else {
          console.error('Password update response unsuccessful:', res);
          const toast = await this.toastController.create({
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
        
        const toast = await this.toastController.create({
          message: errorMessage,
          duration: 3000,
          position: 'bottom',
          color: 'danger'
        });
        toast.present();
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

  async presentSuccessToast() {
    const toast = await this.toastController.create({
      message: 'Password berhasil diperbarui',
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    toast.present();
  }
} 