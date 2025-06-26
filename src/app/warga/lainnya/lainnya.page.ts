import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { WargaPage } from '../warga.page';

@Component({
  selector: 'app-lainnya',
  templateUrl: './lainnya.page.html',
  styleUrls: ['./lainnya.page.scss'],
  standalone: false,
})
export class LainnyaPage implements OnInit {
  nama: string = '';
  createdAt: string = '';
  securityProgress: number = 0;

  constructor(
    private router: Router, 
    private http: HttpClient,
    private wargaPage: WargaPage
  ) { }

  logout() {
    this.wargaPage.logout();
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.loadUserInfo();
    this.checkSecurityProgress();
  }

  private loadUserInfo() {
    const user = localStorage.getItem('user');
    let users_id = '';
    if (user) {
      try {
        const userObj = JSON.parse(user);
        users_id = userObj.id || userObj.users_id || '';
      } catch (e) {}
    }
    if (users_id) {
      this.http.post<any>(`${environment.apiUrl}/api/warga/userinfo`, { users_id }).subscribe({
        next: (res) => {
          this.nama = res.name;
          this.createdAt = res.created_at;
        },
        error: (err) => {
          this.nama = '-';
          this.createdAt = '-';
        }
      });
    } else {
      this.nama = '-';
      this.createdAt = '-';
    }
  }

  private checkSecurityProgress() {
    // Reset progress ke 0 di awal
    this.securityProgress = 0;
    
    const user = localStorage.getItem('user');
    let users_id = '';
    if (user) {
      try {
        const userObj = JSON.parse(user);
        users_id = userObj.id || userObj.users_id || '';
      } catch (e) {}
    }
    
    if (!users_id) {
      this.securityProgress = 0;
      return;
    }

    // Cek status PIN
    this.http.post<any>(`${environment.apiUrl}/api/warga/keamanan/get-pin-security`, { users_id }).subscribe({
      next: (res) => {
        // PIN aktif bernilai 50% dari total progress
        const pinEnabled = res && res.success && res.pin_security_enabled;
        
        // Cek status sidik jari
        const securitySettings = localStorage.getItem('security');
        let fingerprintEnabled = false;
        
        if (securitySettings) {
          try {
            const settings = JSON.parse(securitySettings);
            // Sidik jari aktif bernilai 50% dari total progress
            fingerprintEnabled = settings === 'fingerprint_is_active';
          } catch (e) {
            console.error('Error parsing security settings:', e);
          }
        }
        
        // Hitung total progress (reset nilai awal)
        this.securityProgress = 0;
        if (pinEnabled) this.securityProgress += 50;
        if (fingerprintEnabled) this.securityProgress += 50;
        
        console.log('Security Progress:', {
          pin: pinEnabled ? 'Aktif' : 'Tidak Aktif',
          fingerprint: fingerprintEnabled ? 'Aktif' : 'Tidak Aktif',
          total: this.securityProgress + '%'
        });
      },
      error: (err) => {
        console.error('Error checking PIN status:', err);
        
        // Jika terjadi error, hanya cek status sidik jari
        const securitySettings = localStorage.getItem('security');
        this.securityProgress = 0;
        
        if (securitySettings) {
          try {
            const settings = JSON.parse(securitySettings);
            // Tanpa PIN, sidik jari bernilai 50% saja
            if (settings === 'fingerprint_is_active') {
              this.securityProgress = 50;
            }
          } catch (e) {
            console.error('Error parsing security settings:', e);
          }
        }
      }
    });
  }
}
