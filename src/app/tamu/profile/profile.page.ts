import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {
  userData: any = {};
  tamuId: string = '';
  isLoading: boolean = false;

  constructor(
    private navCtrl: NavController, 
    private http: HttpClient,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    // No longer fetch here, handled in ionViewWillEnter
  }

  ionViewWillEnter() {
    this.loadTamuIdFromLocalStorage();
    this.fetchProfile();
  }

  loadTamuIdFromLocalStorage() {
    const userStr = localStorage.getItem('tamu_data');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.tamuId = user.tamu_id || '';
      } catch (e) {
        this.tamuId = '';
      }
    }
  }

  fetchProfile(callback?: () => void) {
    if (!this.tamuId) {
      this.showToast('ID tamu tidak ditemukan');
      if (callback) callback();
      return;
    }
    this.isLoading = true;
    
    this.http.post<any>(`${environment.apiUrl}/api/tamu/profile`, { tamu_id: this.tamuId }).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          const data = response.data;
          this.userData = {
            name: data.nama,
            tamuId: data.tamu_id,
            nik: data.nik,
            address: data.alamat_ktp,
            nationality: data.kewarganegaraan,
            phoneNumber: data.no_hp,
            email: data.email
          };
        } else {
          this.showToast(response.message || 'Gagal memuat data profil');
        }
        this.isLoading = false;
        if (callback) callback();
      },
      error: (err) => {
        console.error('Gagal mengambil data profil', err);
        this.showToast('Terjadi kesalahan saat memuat profil');
        this.isLoading = false;
        if (callback) callback();
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'dark',
      cssClass: 'toast-custom'
    });
    await toast.present();
  }

  doRefresh(event: any) {
    this.loadTamuIdFromLocalStorage();
    this.fetchProfile(() => {
      event.target.complete();
    });
  }

  goBack() {
    this.navCtrl.back();
  }
}
