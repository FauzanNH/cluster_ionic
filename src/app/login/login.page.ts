import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RefreshService } from '../services/refresh.service';
import { PinAuthService } from '../services/pin-auth.service';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  loginValue: string = '';
  password: string = '';
  fcmToken: string | null = null;

  constructor(
    private router: Router,
    private http: HttpClient, 
    private alertController: AlertController, 
    private loadingController: LoadingController,
    private modalController: ModalController,
    private pinAuthService: PinAuthService,
    private fb: FormBuilder,
    private refreshService: RefreshService,
    private firebaseService: FirebaseService
  ) {
    // Reset loading state untuk memastikan state bersih
    this.isLoading = false;
    
    // Inisialisasi form login
    this.loginForm = this.fb.group({
      login: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // Reset loading state
    this.isLoading = false;
    
    // Hapus token lama jika ada
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  
  ionViewWillEnter() {
    // Reset loading state ketika halaman akan ditampilkan
    this.isLoading = false;
    
    // Hapus flag logout jika ada
    const isLogout = localStorage.getItem('is_logout');
    if (isLogout === 'true') {
      // Hapus flag
      localStorage.removeItem('is_logout');
      
      // Pastikan spinner tidak berputar
      setTimeout(() => {
        this.isLoading = false;
      }, 100);
    }
  }

  async login() {
    if (!this.loginForm.valid) {
      this.presentInvalidFormAlert();
      return;
    }
    
    this.isLoading = true;
    const formData = this.loginForm.value;

    try {
      // Kirim request ke API login
      const response = await this.http.post<any>(`${environment.apiUrl}/api/login`, formData).toPromise();
      
      // Simpan informasi login ke localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('last_login_time', new Date().getTime().toString());
      localStorage.setItem('from_login_page', 'true');
      
      // Simpan role pengguna untuk digunakan oleh sistem notifikasi
      if (response.user && response.user.role) {
        localStorage.setItem('user_role', response.user.role);
      }
      
      // Dapatkan FCM token dan perbarui di server
      await this.getFCMToken(response.user);
      
      // Redirect sesuai dengan role
      if (response.user && response.user.role) {
        this.router.navigateByUrl(this.getRoleHomepage(response.user.role));
      } else {
        // Default ke warga jika role tidak tersedia
        this.router.navigateByUrl('/warga/beranda');
      }
      
    } catch (error: any) { // Tambahkan type annotation untuk error
      this.isLoading = false;
      console.error('Login error:', error);
            
      // Handle berbagai jenis error
      if (error && error.status === 401) {
        this.presentErrorAlert('Login gagal', 'Email/ID atau password salah. Silakan coba lagi.');
      } else if (error && error.status === 403) {
        this.presentErrorAlert('Akun Diblokir', 'Akun Anda telah diblokir. Silakan hubungi administrator.');
        } else {
        this.presentErrorAlert('Kesalahan Koneksi', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda atau coba lagi nanti.');
      }
    } finally {
      // Pastikan isLoading selalu diatur ke false setelah semua operasi selesai,
      // bahkan jika ada error dalam proses redirect
      setTimeout(() => {
        this.isLoading = false;
      }, 500);
    }
  }

  /**
   * Mendapatkan FCM token dan memperbarui di server
   */
  async getFCMToken(user: any) {
    try {
      // Dapatkan FCM token dari service
      const token = await this.firebaseService.getFCMToken();
      if (token) {
        this.fcmToken = token;
        // Update token di server
        this.firebaseService.updateTokenInServer(token).subscribe();
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  private getRoleHomepage(role: string): string {
    switch (role) {
      case 'Warga':
        return '/warga/beranda';
      case 'Satpam':
        return '/satpam/beranda';
      default:
        return '/warga/beranda';
      }
  }

  private async presentInvalidFormAlert() {
    const alert = await this.alertController.create({
      header: 'Form Tidak Valid',
      message: 'Silakan isi semua field yang diperlukan.',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  private async presentErrorAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }
}
