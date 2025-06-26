import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-login-tamu',
  templateUrl: './login-tamu.page.html',
  styleUrls: ['./login-tamu.page.scss'],
  standalone: false,
})
export class LoginTamuPage implements OnInit {

  idTamu: string = '';
  isLoading: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // Cek apakah user sudah login
    const tamuData = localStorage.getItem('tamu_data');
    if (tamuData) {
      this.router.navigate(['/tamu/dashboard']);
    }
  }

  async loginTamu() {
    if (!this.idTamu) {
      this.presentErrorToast('ID Tamu wajib diisi!');
      return;
    }
    this.isLoading = true;
    this.http.post(`${environment.apiUrl}/api/tamu/login`, { tamu_id: this.idTamu }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.success) {
          // Simpan data tamu ke localStorage dengan key yang konsisten
          localStorage.setItem('tamu_data', JSON.stringify(res.data));
          // Navigasi ke dashboard tamu tanpa reload
          this.router.navigate(['/tamu/dashboard'], { replaceUrl: true });
        } else {
          this.presentErrorToast(res.message || 'Login gagal');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.presentErrorToast(err?.error?.message || 'ID Tamu tidak ditemukan');
      }
    });
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
}

