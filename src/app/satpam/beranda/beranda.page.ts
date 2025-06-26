import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface Activity {
  aktivitas_id?: string;
  type?: string;
  name?: string;
  location?: string;
  time?: string;
  date?: string;
  description?: string;
  id?: number;
  judul?: string;
  sub_judul?: string;
  created_at?: string;
}

@Component({
  selector: 'app-beranda',
  templateUrl: './beranda.page.html',
  styleUrls: ['./beranda.page.scss'],
  standalone: false,
})
export class BerandaPage implements OnInit {

  user = JSON.parse(localStorage.getItem('user') || '{}');
  nomorPegawai = 'SP-2023-001';
  totalTamuHariIni = 0;
  tamuBerkunjung = 0;
  isLoading = false;
  namaSatpam: string = '';
  noKep: string = '';
  users_id: string = '';
  
  recentActivities: Activity[] = [];

  constructor(private router: Router, private http: HttpClient) { }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
  
  ngOnInit() {
    // Ambil users_id dari localStorage
    this.users_id = this.user.users_id || '';

    if (this.users_id) {
      this.getSatpamInfo();
      this.getTotalTamuHariIni();
      this.getTamuSedangBerkunjung();
      this.getRecentActivities();
    }

    // Simulasi loading saat pertama kali buka halaman
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  getSatpamInfo() {
    this.isLoading = true;
    this.http.post<any>(`${environment.apiUrl}/api/satpam/beranda/info`, {
      users_id: this.users_id
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.namaSatpam = res.data.nama;
          this.noKep = res.data.no_kep;
        }
        this.isLoading = false;
      },
      error: (err) => {
        // Handle error
        this.isLoading = false;
      }
    });
  }

  getTotalTamuHariIni() {
    this.http.get<any>(`${environment.apiUrl}/api/tamu/today`).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.totalTamuHariIni = res.total_tamu;
        }
      },
      error: (err) => {
        console.error('Gagal mendapatkan total tamu hari ini:', err);
      }
    });
  }

  getTamuSedangBerkunjung() {
    this.http.get<any>(`${environment.apiUrl}/api/tamu/ongoing`).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.tamuBerkunjung = res.tamu_ongoing;
        }
      },
      error: (err) => {
        console.error('Gagal mendapatkan data tamu sedang berkunjung:', err);
      }
    });
  }
  
  getRecentActivities() {
    this.http.get<any>(`${environment.apiUrl}/api/aktivitas/${this.users_id}`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          // Transformasi data aktivitas dari backend menjadi format yang digunakan di frontend
          this.recentActivities = res.data.map((item: any) => {
            const activity: Activity = {
              aktivitas_id: item.aktivitas_id,
              judul: item.judul,
              sub_judul: item.sub_judul,
              time: this.formatDate(item.created_at)
            };
            
            // Tentukan jenis aktivitas berdasarkan judul
            if (item.judul.toLowerCase().includes('check-in') || item.judul.toLowerCase().includes('masuk')) {
              activity.type = 'check-in';
            } else if (item.judul.toLowerCase().includes('check-out') || item.judul.toLowerCase().includes('keluar')) {
              activity.type = 'check-out';
            } else if (item.judul.toLowerCase().includes('password')) {
              activity.type = 'password';
              activity.name = 'Keamanan Akun';
              activity.location = 'Pengaturan';
            } else {
              activity.type = 'other';
              activity.name = item.judul;
              activity.location = item.sub_judul;
            }
            
            return activity;
          });
        } else {
          this.recentActivities = [];
        }
      },
      error: (err) => {
        console.error('Gagal mendapatkan aktivitas terbaru:', err);
        this.recentActivities = [];
      }
    });
  }

  // Helper untuk format tanggal dari ISO string menjadi format yang lebih mudah dibaca
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const isToday = date.getDate() === today.getDate() && 
                   date.getMonth() === today.getMonth() && 
                   date.getFullYear() === today.getFullYear();
                   
    const isYesterday = date.getDate() === yesterday.getDate() && 
                       date.getMonth() === yesterday.getMonth() && 
                       date.getFullYear() === yesterday.getFullYear();
    
    // Format waktu: HH:MM
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    if (isToday) {
      return `Hari ini, ${timeString}`;
    } else if (isYesterday) {
      return `Kemarin, ${timeString}`;
    } else {
      // Format tanggal: DD/MM/YYYY
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}, ${timeString}`;
    }
  }

  goToCheckinTamu() {
    // Navigasi ke halaman checkin tamu
    console.log('Navigasi ke checkin tamu');
    this.router.navigate(['/satpam/beranda/kunjungantamu']);
  }

  goToLaporanTamu() {
    // Navigasi ke halaman laporan tamu
    console.log('Navigasi ke laporan tamu');
    this.router.navigate(['/satpam/beranda/laporan-harian-tamu']);
  }

  goToJadwalKerja() {
    // Navigasi ke halaman jadwal kerja
    console.log('Navigasi ke jadwal kerja');
    this.router.navigate(['/satpam/beranda/jadwalkerja']);
  }

  async refreshData(event: any) {
    // Refresh semua data
    this.isLoading = true;
    
    // Reload data dari API
    if (this.users_id) {
      this.getSatpamInfo();
      this.getTotalTamuHariIni();
      this.getTamuSedangBerkunjung();
      this.getRecentActivities();
    }
    
    setTimeout(() => {
      this.isLoading = false;
      if (event) {
        event.target.complete();
      }
    }, 1000);
  }
}
