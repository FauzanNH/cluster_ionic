import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { KunjungantamuWargaService } from '../kunjungantamu-warga.service';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class DetailPage implements OnInit {
  kunjungan: any = null;
  isLoading = true;
  kunjungan_id: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    public router: Router,
    private toastController: ToastController,
    private kunjunganService: KunjungantamuWargaService
  ) { }

  ngOnInit() {
    this.kunjungan_id = this.route.snapshot.paramMap.get('kunjungan_id');
    if (this.kunjungan_id) {
      this.loadKunjunganDetail();
    } else {
      this.presentToast('ID Kunjungan tidak ditemukan', 'danger');
      this.router.navigate(['/warga/lainnya/kunjungantamu-warga']);
    }
  }

  async refreshData(event?: any) {
    await this.loadKunjunganDetail();
    if (event) {
      event.target.complete();
    }
  }

  loadKunjunganDetail() {
    this.isLoading = true;

    if (!this.kunjungan_id) {
      this.presentToast('ID Kunjungan tidak ditemukan', 'danger');
      this.isLoading = false;
      return;
    }

    this.kunjunganService.getKunjunganDetail(this.kunjungan_id)
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.kunjungan = response.data;
            console.log('Kunjungan detail:', this.kunjungan);
            console.log('Tamu:', this.kunjungan.tamu);
            console.log('Detail Tamu:', this.kunjungan.tamu?.detailTamu);
            console.log('Detail Tamu (snake_case):', this.kunjungan.tamu?.detail_tamu);
            
            // Jika detailTamu tidak ada, coba cek nama properti lain
            const tamuKeys = this.kunjungan.tamu ? Object.keys(this.kunjungan.tamu) : [];
            console.log('Tamu object keys:', tamuKeys);
            
            // Cek apakah ada properti yang mengandung 'detail' atau 'tamu'
            const detailKeys = tamuKeys.filter(key => key.toLowerCase().includes('detail') || key.toLowerCase().includes('tamu'));
            console.log('Possible detail keys:', detailKeys);
            
            // Jika ada properti detail_tamu, gunakan itu
            if (this.kunjungan.tamu && this.kunjungan.tamu.detail_tamu) {
              console.log('Found detail_tamu:', this.kunjungan.tamu.detail_tamu);
            }
          } else {
            this.presentToast('Gagal memuat detail kunjungan', 'danger');
          }
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading kunjungan detail:', error);
          this.presentToast('Terjadi kesalahan saat memuat detail', 'danger');
          this.isLoading = false;
        }
      });
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Sedang Berlangsung':
        return 'active';
      case 'Meninggalkan Cluster':
        return 'completed';
      case 'Menunggu Menuju Cluster':
        return 'waiting';
      default:
        return '';
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatTime(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTime(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  navigateBack() {
    this.router.navigate(['/warga/lainnya/kunjungantamu-warga']);
  }
} 