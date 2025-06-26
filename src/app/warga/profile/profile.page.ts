import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {
  userData: any = {};
  rumahId: string = '';
  isLoading: boolean = false;

  constructor(private navCtrl: NavController, private http: HttpClient) { }

  ngOnInit() {
    // No longer fetch here, handled in ionViewWillEnter
  }

  ionViewWillEnter() {
    this.loadRumahIdFromLocalStorage();
    this.fetchProfile();
  }

  loadRumahIdFromLocalStorage() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.rumahId = user.rumah_id || user.rumahId || '';
      } catch (e) {
        this.rumahId = '';
      }
    }
    if (!this.rumahId) {
      // fallback, optionally set a default or handle error
      this.rumahId = '';
    }
  }

  fetchProfile(callback?: () => void) {
    if (!this.rumahId) {
      if (callback) callback();
      return;
    }
    this.isLoading = true;
    this.http.post<any>(`${environment.apiUrl}/api/warga/profile`, { rumah_id: this.rumahId }).subscribe({
      next: (data) => {
        this.userData = {
          name: data.nama,
          houseId: data.rumah_id,
          no_kk: data.no_kk,
          familyMembers: data.total_anggota_keluarga,
          ownershipStatus: data.status_kepemilikan,
          block: data.blok_rt,
          address: data.alamat_cluster
        };
        this.isLoading = false;
        if (callback) callback();
      },
      error: (err) => {
        console.error('Gagal mengambil data profil', err);
        this.isLoading = false;
        if (callback) callback();
      }
    });
  }

  doRefresh(event: any) {
    this.loadRumahIdFromLocalStorage();
    this.fetchProfile(() => {
      event.target.complete();
    });
  }

  editProfile() {
    // Implement edit profile functionality
    console.log('Edit profile clicked');
  }

  changePassword() {
    // Implement change password functionality
    console.log('Change password clicked');
  }

  goBack() {
    this.navCtrl.back();
  }
}
