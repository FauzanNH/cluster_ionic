import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-lainnya',
  templateUrl: './lainnya.page.html',
  styleUrls: ['./lainnya.page.scss'],
  standalone: false,
})
export class LainnyaPage implements OnInit {
  nama: string = '';
  createdAt: string = '';
  isLoading: boolean = true;
  apiUrl: string = environment.apiUrl;
  userId: string = '';
  securityProgress: number = 60; // Default value

  constructor(
    private router: Router, 
    private http: HttpClient,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {}

  ionViewWillEnter() {
    this.loadUserInfo();
  }

  private loadUserInfo() {
    this.isLoading = true;
    
    // Mengambil user_id dari localStorage
    const userStorage = localStorage.getItem('user');
    if (userStorage) {
      try {
        const userData = JSON.parse(userStorage);
        this.userId = userData.users_id;
        
        // Memanggil API untuk mendapatkan data profil
        this.http.post<any>(`${this.apiUrl}/api/satpam/profile`, { users_id: this.userId })
          .subscribe({
            next: (response) => {
              if (response && response.status) {
                this.nama = response.data.nama;
                this.createdAt = response.data.terdaftar_pada;
              } else {
                this.showToast(response.message || 'Gagal memuat data profil');
              }
              this.isLoading = false;
            },
            error: (error) => {
              console.error('Error loading profile:', error);
              this.showToast('Terjadi kesalahan saat memuat data profil');
              this.isLoading = false;
            }
          });
      } catch (e) {
        this.showToast('Terjadi kesalahan saat memuat data pengguna');
        this.isLoading = false;
      }
    } else {
      this.showToast('Data pengguna tidak ditemukan');
      this.isLoading = false;
    }
  }
  
  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }

  logout() {
    // Clear local storage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Navigate to login page
    this.router.navigate(['/login']);
  }
}
