import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sethint',
  templateUrl: './sethint.page.html',
  styleUrls: ['./sethint.page.scss'],
  standalone: false,
})
export class SethintPage implements OnInit {
  public hint: string = '';
  public isSaving: boolean = false;
  private users_id: string = '';

  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadCurrentHint();
  }

  ionViewWillEnter() {
    // Memastikan data user terload saat halaman dibuka
    this.loadCurrentHint();
  }

  loadCurrentHint() {
    // Ambil users_id dari localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.users_id = user.users_id || user.id || '';
        
        if (this.users_id) {
          this.http.post(`${environment.apiUrl}/api/warga/keamanan/get-hint`, {
            users_id: this.users_id
          }).subscribe({
            next: (res: any) => {
              if (res.success && res.hint) {
                this.hint = res.hint;
              }
            },
            error: (err) => {
              console.error('Gagal memuat hint:', err);
            }
          });
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }

  onBack() {
    this.router.navigate(['/warga/lainnya/keamanan']);
  }

  isValidHint(): boolean {
    return !!this.hint && this.hint.trim().length >= 3;
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

  saveHint() {
    if (!this.isValidHint()) {
      this.presentErrorToast('Hint minimal 3 karakter');
      return;
    }

    if (!this.users_id) {
      this.presentErrorToast('User tidak ditemukan');
      return;
    }

    this.isSaving = true;
    
    this.http.post(`${environment.apiUrl}/api/warga/keamanan/update-hint`, {
      users_id: this.users_id,
      hint: this.hint.trim()
    }).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        if (res.success) {
          this.presentSuccessToast('Hint berhasil diperbarui!');
          setTimeout(() => {
            this.router.navigate(['/warga/lainnya/keamanan']);
          }, 1000);
        } else {
          this.presentErrorToast(res.message || 'Gagal memperbarui hint');
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.presentErrorToast(err.error?.message || 'Gagal memperbarui hint');
      }
    });
  }
}
