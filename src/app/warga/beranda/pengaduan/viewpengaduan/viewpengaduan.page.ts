import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ToastController, AlertController, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-viewpengaduan',
  templateUrl: './viewpengaduan.page.html',
  styleUrls: ['./viewpengaduan.page.scss'],
  standalone: false,
})
export class ViewpengaduanPage implements OnInit {
  pengaduanId: string = '';
  pengaduan: any = {};
  isLoading: boolean = false;
  dokumen1Url: string | null = null;
  dokumen2Url: string | null = null;
  isModalOpen: boolean = false;
  currentImageUrl: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.pengaduanId = params.get('id') || '';
      if (this.pengaduanId) {
        this.loadPengaduanDetail();
      } else {
        this.router.navigate(['/warga/beranda/pengaduan']);
      }
    });
  }

  loadPengaduanDetail() {
    this.isLoading = true;

    this.http.get<any>(`${environment.apiUrl}/api/warga/pengaduan/detail?pengaduan_id=${this.pengaduanId}`)
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.pengaduan = res.data;
            
            // Format tanggal
            if (this.pengaduan.created_at) {
              const date = new Date(this.pengaduan.created_at);
              this.pengaduan.formatted_date = date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
            
            // Set URL dokumen jika ada
            if (this.pengaduan.dokumen1) {
              this.dokumen1Url = `${environment.apiUrl}/${this.pengaduan.dokumen1}`;
            }
            if (this.pengaduan.dokumen2) {
              this.dokumen2Url = `${environment.apiUrl}/${this.pengaduan.dokumen2}`;
            }
          } else {
            this.showToast('Data pengaduan tidak ditemukan');
            this.router.navigate(['/warga/beranda/pengaduan']);
          }
          this.isLoading = false;
        },
        error: (err) => {
          this.showToast('Gagal memuat data pengaduan');
          this.isLoading = false;
          this.router.navigate(['/warga/beranda/pengaduan']);
        }
      });
  }

  async showToast(message: string, type: 'success' | 'error' = 'error') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: type === 'success' ? 'success' : 'danger',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/warga/beranda/pengaduan']);
  }

  async openDocument(url: string) {
    if (!url) return;
    
    // Jika dokumen adalah PDF, buka di tab baru
    if (url.toLowerCase().endsWith('.pdf')) {
      window.open(url, '_blank');
      return;
    }
    
    // Jika dokumen adalah gambar, tampilkan di modal
    this.currentImageUrl = url;
    this.isModalOpen = true;
  }
  
  closeImageModal(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isModalOpen = false;
  }

  async batalAjukanPengaduan() {
    if (!this.pengaduanId) return;
    
    // Dialog konfirmasi yang lebih baik
    const alert = await this.alertController.create({
      header: 'Konfirmasi Pembatalan',
      message: 'Yakin ingin membatalkan pengaduan ini? Tindakan ini tidak dapat dibatalkan.',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel',
          cssClass: 'alert-button-cancel',
        },
        {
          text: 'Ya, Batalkan',
          cssClass: 'alert-button-confirm',
          handler: () => {
            this.isLoading = true;
            this.http.delete<any>(`${environment.apiUrl}/api/warga/pengaduan/${this.pengaduanId}`)
              .subscribe({
                next: (res) => {
                  this.isLoading = false;
                  if (res.success) {
                    this.showToast('Pengaduan berhasil dibatalkan', 'success');
                    this.router.navigate(['/warga/beranda/pengaduan']);
                  } else {
                    this.showToast(res.message || 'Gagal membatalkan pengaduan');
                  }
                },
                error: (err) => {
                  this.isLoading = false;
                  this.showToast('Gagal membatalkan pengaduan');
                }
              });
          }
        }
      ]
    });

    await alert.present();
  }
}
