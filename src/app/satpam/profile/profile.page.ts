import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface UserProfile {
  nama: string;
  no_kep: string;
  nik: string;
  tanggal_lahir: string;
  seksi_unit_gerbang: string;
  terdaftar_pada: string;
  email: string;
  no_hp: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {
  satpamData: UserProfile = {
    nama: '',
    no_kep: '',
    nik: '',
    tanggal_lahir: '',
    seksi_unit_gerbang: '',
    terdaftar_pada: '',
    email: '',
    no_hp: ''
  };
  
  isLoading: boolean = true;
  apiUrl: string = environment.apiUrl;
  userId: string = '';

  constructor(
    private navCtrl: NavController,
    private http: HttpClient,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    // Mengambil user_id dari localStorage
    const userStorage = localStorage.getItem('user');
    if (userStorage) {
      try {
        const userData = JSON.parse(userStorage);
        this.userId = userData.users_id;
        this.loadProfileData();
      } catch (e) {
        this.showToast('Terjadi kesalahan saat memuat data pengguna');
        this.isLoading = false;
      }
    } else {
      this.showToast('Data pengguna tidak ditemukan');
      this.isLoading = false;
    }
  }

  loadProfileData() {
    this.isLoading = true;
    
    this.http.post<any>(`${this.apiUrl}/api/satpam/profile`, { users_id: this.userId })
      .subscribe({
        next: (response) => {
          if (response && response.status) {
            this.satpamData = response.data;
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
  }

  doRefresh(event: any) {
    this.loadProfileData();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }

  editProfile() {
    // Implement edit profile functionality
    console.log('Edit profile clicked');
    this.showToast('Fitur edit profil belum tersedia');
  }

  changePassword() {
    // Implement change password functionality
    console.log('Change password clicked');
    this.showToast('Fitur ubah kata sandi belum tersedia');
  }

  goBack() {
    this.navCtrl.back();
  }
}
