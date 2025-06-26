import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { KunjungantamuService } from '../kunjungantamu.service';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Howl } from 'howler';

@Component({
  selector: 'app-tamu-masuk',
  templateUrl: './tamu-masuk.page.html',
  styleUrls: ['./tamu-masuk.page.scss'],
  standalone: false,
})
export class TamuMasukPage implements OnInit, OnDestroy {
  isScanning: boolean = false;
  isLoading = false;
  manualKunjunganId: string = '';
  scanResult: string = '';
  beepSound: Howl;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private kunjunganService: KunjungantamuService
  ) {
    // Inisialisasi suara beep
    this.beepSound = new Howl({
      src: ['assets/sounds/beep.mp3']
    });
  }

  ngOnInit() {
    // Tidak langsung memulai scan saat halaman dibuka
    // Pengguna harus menekan tombol "Mulai Scan" terlebih dahulu
  }

  ngOnDestroy() {
    this.stopScan();
  }

  ionViewWillLeave() {
    this.stopScan();
  }

  async startScan() {
    if (!Capacitor.isNativePlatform()) {
      this.presentAlert('Perangkat tidak mendukung', 'Fitur scan QR code hanya tersedia di perangkat mobile.');
      return;
    }

    // Minta izin kamera
    const status = await BarcodeScanner.checkPermission({ force: true });

    if (status.granted) {
      // Sembunyikan tampilan aplikasi
      document.querySelector('body')?.classList.add('scanner-active');
      
      // Mulai scanning
      this.isScanning = true;
      
      const result = await BarcodeScanner.startScan();
      
      // Jika scan berhasil
      if (result.hasContent) {
        this.scanResult = result.content;
        this.stopScan();
        this.processQRCode(this.scanResult);
      }
    } else {
      this.presentAlert('Izin Ditolak', 'Aplikasi membutuhkan izin kamera untuk melakukan scan QR code.');
    }
  }

  async stopScan() {
    if (this.isScanning) {
      // Hentikan scan
      BarcodeScanner.stopScan();
      
      // Kembalikan tampilan aplikasi
      document.querySelector('body')?.classList.remove('scanner-active');
      
      this.isScanning = false;
    }
  }

  async scanFromGallery() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos
      });
      
      if (image) {
        // Tampilkan pesan bahwa fitur ini dalam pengembangan
        this.presentAlert(
          'Fitur dalam Pengembangan',
          'Scan QR dari galeri sedang dalam tahap pengembangan. Silakan gunakan scan kamera langsung untuk saat ini.'
        );
        
        // Pada implementasi sebenarnya, Anda akan memproses gambar untuk membaca QR code
        // dan kemudian memanggil this.processQRCode() dengan hasil pembacaan
      }
    } catch (error) {
      console.error('Error accessing gallery:', error);
      this.presentToast('Gagal mengakses galeri', 'danger');
    }
  }

  async processQRCode(qrData: string) {
    try {
      // Parse data QR code
      const qrObject = JSON.parse(qrData);
      
      if (!qrObject.kunjungan_id) {
        this.presentToast('QR Code tidak valid', 'danger');
        return;
      }
      
      // Validasi waktu kedaluwarsa QR code
      if (qrObject.expires) {
        const now = new Date().getTime();
        if (now > qrObject.expires) {
          this.presentAlert('QR Code Kadaluarsa', 'QR Code ini sudah tidak berlaku. Silakan minta tamu untuk memperbarui QR Code.');
          return;
        }
      }
      
      // Proses tamu masuk dengan ID kunjungan dari QR code
      await this.processTamuMasuk(qrObject.kunjungan_id);
      
    } catch (error) {
      console.error('Error processing QR code:', error);
      this.presentToast('Format QR Code tidak valid', 'danger');
    }
  }

  async processManualInput() {
    if (!this.manualKunjunganId) {
      this.presentToast('Masukkan ID kunjungan terlebih dahulu', 'warning');
      return;
    }
    
    await this.processTamuMasuk(this.manualKunjunganId);
  }

  async processTamuMasuk(kunjunganId: string) {
    this.isLoading = true;
    
    try {
      const loading = await this.loadingController.create({
        message: 'Memproses tamu masuk...',
        spinner: 'crescent'
      });
      await loading.present();
      
      this.kunjunganService.tamuMasuk(kunjunganId).subscribe({
        next: async (response) => {
          loading.dismiss();
          this.isLoading = false;
          
          if (response.success) {
            // Putar suara beep ketika berhasil
            this.beepSound.play();
            
            this.presentToast('Tamu berhasil diproses masuk', 'success');
            
            // Navigasi ke halaman scan berhasil
            this.router.navigate(['/satpam/beranda/kunjungantamu/scan-berhasil', kunjunganId, 'masuk']);
          } else {
            this.presentToast('Gagal memproses tamu masuk: ' + response.message, 'danger');
          }
        },
        error: (error) => {
          loading.dismiss();
          this.isLoading = false;
          console.error('Error processing tamu masuk:', error);
          this.presentToast('Terjadi kesalahan saat memproses tamu masuk', 'danger');
        }
      });
    } catch (error) {
      this.isLoading = false;
      console.error('Error in processTamuMasuk:', error);
      this.presentToast('Terjadi kesalahan saat memproses tamu masuk', 'danger');
    }
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

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }
} 