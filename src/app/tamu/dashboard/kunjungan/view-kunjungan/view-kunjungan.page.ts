import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController, ToastController, AlertController, AnimationController, ModalController } from '@ionic/angular';
import { KunjunganService, Kunjungan } from '../kunjungan.service';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { trigger, transition, style, animate } from '@angular/animations';
import { Howl } from 'howler';

@Component({
  selector: 'app-view-kunjungan',
  templateUrl: './view-kunjungan.page.html',
  styleUrls: ['./view-kunjungan.page.scss'],
  standalone: false,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('500ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
    ]),
  ],
})
export class ViewKunjunganPage implements OnInit {
  kunjunganId: string = '';
  kunjungan: Kunjungan | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  animationState: string = 'in';
  
  // QR Code properties
  isQRModalOpen: boolean = false;
  qrCodeData: string = '';
  qrCodeExpiry: number = 180; // 3 menit dalam detik
  qrCodeTimer: number = 180;
  qrCodeInterval: any;
  qrCodeExpired: boolean = false;
  qrCodeUsed: boolean = false;
  
  // Audio properties
  beepSound: Howl;

  constructor(
    private route: ActivatedRoute,
    private kunjunganService: KunjunganService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private animationCtrl: AnimationController,
    private modalCtrl: ModalController
  ) {
    // Inisialisasi suara beep
    this.beepSound = new Howl({
      src: ['assets/sounds/beep.mp3']
    });
  }

  ngOnInit() {
    this.kunjunganId = this.route.snapshot.paramMap.get('id') || '';
    if (this.kunjunganId) {
      this.loadKunjunganDetail();
    } else {
      this.errorMessage = 'ID Kunjungan tidak ditemukan';
    }
  }

  async loadKunjunganDetail() {
    if (!this.kunjunganId) return;

    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const loading = await this.loadingCtrl.create({
        message: 'Memuat detail kunjungan...',
        spinner: 'crescent',
        cssClass: 'custom-loading'
      });
      await loading.present();
      
      this.kunjunganService.getKunjunganById(this.kunjunganId).subscribe({
        next: (response) => {
          if (response.success) {
            this.kunjungan = response.data;
            console.log('Kunjungan detail:', this.kunjungan);
            this.generateQRCodeData();
            this.animateContent();
          } else {
            this.errorMessage = 'Gagal memuat data kunjungan';
            this.presentToast('Gagal memuat data kunjungan', 'danger');
          }
          loading.dismiss();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading kunjungan detail:', error);
          this.errorMessage = 'Terjadi kesalahan saat memuat data';
          this.presentToast('Terjadi kesalahan saat memuat data', 'danger');
          loading.dismiss();
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error in loadKunjunganDetail:', error);
      this.errorMessage = 'Terjadi kesalahan saat memuat data';
      this.presentToast('Terjadi kesalahan saat memuat data', 'danger');
      this.isLoading = false;
    }
  }

  formatDateTime(dateTimeString: string | null): string {
    if (!dateTimeString) return '-';
    
    try {
      const date = new Date(dateTimeString);
      return format(date, 'dd MMMM yyyy, HH:mm', { locale: id });
    } catch (e) {
      return dateTimeString;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Sedang Berlangsung':
        return 'success';
      case 'Menunggu Menuju Cluster':
        return 'warning';
      case 'Meninggalkan Cluster':
        return 'medium';
      default:
        return 'primary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Sedang Berlangsung':
        return 'checkmark-circle-outline';
      case 'Menunggu Menuju Cluster':
        return 'time-outline';
      case 'Meninggalkan Cluster':
        return 'log-out-outline';
      default:
        return 'information-circle-outline';
    }
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom',
      cssClass: 'custom-toast',
      buttons: [
        {
          side: 'end',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  async refreshData(event?: any) {
    await this.loadKunjunganDetail();
    if (event) {
      event.target.complete();
    }
  }

  animateContent() {
    // Animasi untuk konten setelah data dimuat
    setTimeout(() => {
      const contentElement = document.querySelector('.detail-content');
      if (contentElement) {
        const animation = this.animationCtrl.create()
          .addElement(contentElement)
          .duration(500)
          .fromTo('opacity', '0', '1');
        
        animation.play();
      }
    }, 100);
  }

  // QR Code methods
  generateQRCodeData() {
    if (this.kunjungan) {
      // Reset status QR code
      this.qrCodeExpired = false;
      this.qrCodeUsed = false;
      
      // Reset timer
      this.qrCodeTimer = this.qrCodeExpiry;
      
      // Membuat data QR code yang berisi informasi kunjungan
      const qrData = {
        kunjungan_id: this.kunjungan.kunjungan_id,
        tamu_id: this.kunjungan.tamu_id,
        status: this.kunjungan.status_kunjungan,
        timestamp: new Date().getTime(), // Menambahkan timestamp untuk keamanan
        expires: new Date().getTime() + (this.qrCodeExpiry * 1000) // Waktu kedaluwarsa QR (3 menit)
      };
      
      // Mengkonversi objek ke JSON string
      this.qrCodeData = JSON.stringify(qrData);
    }
  }

  showQRCode() {
    if (this.kunjungan?.status_kunjungan === 'Meninggalkan Cluster') {
      this.presentToast('QR Code tidak tersedia karena kunjungan sudah selesai', 'warning');
      return;
    }
    this.isQRModalOpen = true;
    this.startQRCodeTimer();
  }

  closeQRModal() {
    this.isQRModalOpen = false;
    this.stopQRCodeTimer();
  }
  
  startQRCodeTimer() {
    // Bersihkan interval sebelumnya jika ada
    this.stopQRCodeTimer();
    
    // Mulai timer baru
    this.qrCodeInterval = setInterval(() => {
      this.qrCodeTimer--;
      
      // Jika timer habis, tandai QR sebagai kedaluwarsa
      if (this.qrCodeTimer <= 0) {
        this.qrCodeExpired = true;
        this.stopQRCodeTimer();
      }
    }, 1000);
  }
  
  stopQRCodeTimer() {
    if (this.qrCodeInterval) {
      clearInterval(this.qrCodeInterval);
      this.qrCodeInterval = null;
    }
  }
  
  // Format timer ke format mm:ss
  formatTimer(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Regenerate QR code
  regenerateQRCode() {
    this.generateQRCodeData();
    this.qrCodeExpired = false;
    this.startQRCodeTimer();
  }
  
  // Metode untuk memutar suara beep
  playBeepSound() {
    this.beepSound.play();
  }
  
  // Metode untuk menandai QR sebagai sudah digunakan
  markQRAsUsed() {
    this.qrCodeUsed = true;
    this.stopQRCodeTimer();
    this.playBeepSound();
  }
}
