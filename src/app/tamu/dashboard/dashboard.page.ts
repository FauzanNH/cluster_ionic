import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TamuPage } from '../tamu.page';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface Aktivitas {
  aktivitas_id: string;
  judul: string;
  sub_judul: string;
  created_at: string;
}

interface DashboardAktivitas {
  id: string;
  title: string;
  description: string;
  time: string;
  status: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {
  
  isLoading = false;
  nama = 'Not Found 404';
  tamu_id = 'Not Found 404';
  totalKunjungan = 5;
  
  aktivitasTerbaru: DashboardAktivitas[] = [];

  constructor(
    private router: Router,
    private tamuPage: TamuPage,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.getTamuInfo();
    this.getTotalKunjungan();
  }

  ionViewWillEnter() {
    // Refresh data saat halaman akan ditampilkan
    this.refreshData(null);
  }
  
  private simulateLoading() {
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
    }, 1500);
  }
  
  refreshData(event: any) {
    this.getTamuInfo();
    this.getAktivitasTerbaru();
    this.getTotalKunjungan();
    if (event) {
      setTimeout(() => {
        event.target.complete();
      }, 1500);
    }
  }
  
  logout() {
    this.tamuPage.logout();
  }

  goToPermintaanKunjungan() {
    this.router.navigate(['/tamu/dashboard/kunjungan']);
  }

  goToSewaBeliRumah() {
    this.router.navigate(['/tamu/sewa-beli']);
  }

  getTamuInfo() {
    const tamu = localStorage.getItem('tamu_data');
    let tamu_id = '';
    if (tamu) {
      try {
        const tamuObj = JSON.parse(tamu);
        tamu_id = tamuObj.tamu_id || tamu
      } catch {
        tamu_id = tamu;
      }
    }
    if (tamu_id) {
      this.isLoading = true;
      this.http.post<any>(`${environment.apiUrl}/api/tamu/dashboard/info`, { tamu_id })
        .subscribe({
          next: (res) => {
            this.nama = res.nama;
            this.tamu_id = res.tamu_id;
            this.isLoading = false;
          },
          error: () => {
            this.nama = 'Tamu';
            this.tamu_id = tamu_id;
            this.isLoading = false;
          }
        });
    }
  }

  getAktivitasTerbaru() {
    const tamu = localStorage.getItem('tamu_data');
    let tamu_id = '';
    if (tamu) {
      try {
        const tamuObj = JSON.parse(tamu);
        tamu_id = tamuObj.tamu_id || tamu
      } catch {
        tamu_id = tamu;
      }
    }
    if (tamu_id) {
      this.isLoading = true;
      this.http.get<{success: boolean, data: Aktivitas[]}>(`${environment.apiUrl}/api/aktivitas/by-tamu/${tamu_id}`)
        .subscribe({
          next: (res) => {
            if (res.success && res.data) {
              // Ambil 2 data terbaru
              const latestAktivitas = res.data.slice(0, 2);
              this.aktivitasTerbaru = this.formatAktivitasForDashboard(latestAktivitas);
            } else {
              this.setDummyAktivitas();
            }
            this.isLoading = false;
          },
          error: () => {
            this.setDummyAktivitas();
            this.isLoading = false;
          }
        });
    } else {
      this.setDummyAktivitas();
    }
  }

  formatAktivitasForDashboard(aktivitas: Aktivitas[]): DashboardAktivitas[] {
    return aktivitas.map(item => {
      // Konversi created_at menjadi format yang lebih user-friendly
      const createdDate = new Date(item.created_at);
      const now = new Date();
      const diffMs = now.getTime() - createdDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // Format waktu (jam:menit)
      const hours = createdDate.getHours().toString().padStart(2, '0');
      const minutes = createdDate.getMinutes().toString().padStart(2, '0');
      const timeFormat = `${hours}:${minutes}`;
      
      // Format tanggal
      const day = createdDate.getDate();
      const month = createdDate.getMonth();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      const dateFormat = `${day} ${monthNames[month]}`;
      
      let timeString = '';
      if (diffMinutes < 1) {
        timeString = `Baru saja · ${timeFormat}`;
      } else if (diffMinutes < 60) {
        timeString = `${diffMinutes} menit lalu · ${timeFormat}`;
      } else if (diffHours < 24) {
        timeString = `${diffHours} jam lalu · ${timeFormat}`;
      } else if (diffDays === 1) {
        timeString = `Kemarin · ${dateFormat} · ${timeFormat}`;
      } else {
        timeString = `${dateFormat} · ${timeFormat}`;
      }

      // Tentukan status dan icon berdasarkan judul atau pola tertentu dalam sub_judul
      let status = 'completed';
      let icon = 'checkmark-circle';
      
      if (item.judul.toLowerCase().includes('kunjungan')) {
        if (item.sub_judul.toLowerCase().includes('menunggu')) {
          status = 'pending';
          icon = 'time';
        } else if (item.sub_judul.toLowerCase().includes('berlangsung')) {
          status = 'active';
          icon = 'home';
        } else if (item.sub_judul.toLowerCase().includes('batal') || item.sub_judul.toLowerCase().includes('ditolak')) {
          status = 'cancelled';
          icon = 'close-circle';
        }
      }

      return {
        id: item.aktivitas_id,
        title: item.judul,
        description: item.sub_judul,
        time: timeString,
        status: status,
        icon: icon
      };
    });
  }

  setDummyAktivitas() {
    this.aktivitasTerbaru = [
      {
        id: 'AKT-00001',
        title: 'Permintaan Kunjungan',
        description: 'Kunjungan ke Blok A2 No. 15 disetujui',
        time: '1 jam yang lalu',
        status: 'completed',
        icon: 'checkmark-circle'
      },
      {
        id: 'AKT-00002',
        title: 'Permintaan Kunjungan',
        description: 'Menunggu persetujuan untuk kunjungan Blok B3 No. 7',
        time: '3 jam yang lalu',
        status: 'pending',
        icon: 'time'
      }
    ];
  }

  getTotalKunjungan() {
    const tamu = localStorage.getItem('tamu_data');
    let tamu_id = '';
    if (tamu) {
      try {
        const tamuObj = JSON.parse(tamu);
        tamu_id = tamuObj.tamu_id || tamu;
      } catch {
        tamu_id = tamu;
      }
    }
    if (tamu_id) {
      this.http.post<any>(`${environment.apiUrl}/api/tamu/dashboard/total-kunjungan`, { tamu_id })
        .subscribe({
          next: (res) => {
            this.totalKunjungan = res.total_kunjungan;
          },
          error: () => {
            this.totalKunjungan = 0;
          }
        });
    } else {
      this.totalKunjungan = 0;
    }
  }
}
