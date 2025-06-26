import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { KunjungantamuService } from '../kunjungantamu.service';

@Component({
  selector: 'app-viewdetail',
  templateUrl: './viewdetail.page.html',
  styleUrls: ['./viewdetail.page.scss'],
  standalone: false,
})
export class ViewdetailPage implements OnInit {
  kunjungan: any = null;
  isLoading = true;
  kunjungan_id: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private toastController: ToastController,
    private loadingCtrl: LoadingController,
    private alertController: AlertController,
    private kunjunganService: KunjungantamuService
  ) { }

  ngOnInit() {
    this.kunjungan_id = this.route.snapshot.paramMap.get('kunjungan_id');
    this.loadData();
  }

  loadData() {
    if (this.kunjungan_id) {
      this.isLoading = true;
      this.http.get<any>(`${environment.apiUrl}/api/satpam/kunjungan/${this.kunjungan_id}`).subscribe({
        next: (res) => {
          this.kunjungan = res.data;
          this.isLoading = false;
        },
        error: () => {
          this.kunjungan = null;
          this.isLoading = false;
          this.presentToast('Gagal memuat data kunjungan', 'danger');
        }
      });
    }
  }

  refreshData(event: any) {
    this.loadData();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color
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
  
  async processTamuMasuk(kunjunganId: string) {
    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: 'Apakah Anda yakin ingin memproses tamu masuk?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Ya, Proses',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Memproses...',
              spinner: 'crescent'
            });
            await loading.present();
            
            this.kunjunganService.tamuMasuk(kunjunganId).subscribe({
              next: (response) => {
                loading.dismiss();
                if (response.success) {
                  this.presentToast('Status kunjungan berhasil diperbarui', 'success');
                  this.loadData(); // Refresh data
                } else {
                  this.presentToast('Gagal memperbarui status kunjungan', 'danger');
                }
              },
              error: (error) => {
                loading.dismiss();
                console.error('Error updating status:', error);
                this.presentToast('Terjadi kesalahan saat memperbarui status', 'danger');
              }
            });
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  async processTamuKeluar(kunjunganId: string) {
    const alert = await this.alertController.create({
      header: 'Konfirmasi',
      message: 'Apakah Anda yakin ingin memproses tamu keluar?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Ya, Proses',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Memproses...',
              spinner: 'crescent'
            });
            await loading.present();
            
            this.kunjunganService.tamuKeluar(kunjunganId).subscribe({
              next: (response) => {
                loading.dismiss();
                if (response.success) {
                  this.presentToast('Status kunjungan berhasil diperbarui', 'success');
                  this.loadData(); // Refresh data
                } else {
                  this.presentToast('Gagal memperbarui status kunjungan', 'danger');
                }
              },
              error: (error) => {
                loading.dismiss();
                console.error('Error updating status:', error);
                this.presentToast('Terjadi kesalahan saat memperbarui status', 'danger');
              }
            });
          }
        }
      ]
    });
    
    await alert.present();
  }
}
