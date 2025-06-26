import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-pilih-scan',
  templateUrl: './pilih-scan.page.html',
  styleUrls: ['./pilih-scan.page.scss'],
  standalone: false,
})
export class PilihScanPage implements OnInit {

  constructor(
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
  }

  onScanMasuk() {
    this.router.navigate(['/satpam/beranda/kunjungantamu/tamu-masuk']);
  }

  onScanKeluar() {
    this.router.navigate(['/satpam/beranda/kunjungantamu/tamu-keluar']);
  }

  async onGaleriMasuk() {
    try {
      const image = await this.getImageFromGallery();
      if (image) {
        // Proses QR code dari gambar
        await this.processQRFromImage(image, 'masuk');
      }
    } catch (error) {
      console.error('Error accessing gallery:', error);
      this.presentToast('Gagal mengakses galeri', 'danger');
    }
  }

  async onGaleriKeluar() {
    try {
      const image = await this.getImageFromGallery();
      if (image) {
        // Proses QR code dari gambar
        await this.processQRFromImage(image, 'keluar');
      }
    } catch (error) {
      console.error('Error accessing gallery:', error);
      this.presentToast('Gagal mengakses galeri', 'danger');
    }
  }

  async getImageFromGallery() {
    if (!Capacitor.isNativePlatform()) {
      this.presentToast('Fitur ini hanya tersedia di perangkat mobile', 'warning');
      return null;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos
      });

      return image;
    } catch (error) {
      console.error('Error getting photo from gallery:', error);
      return null;
    }
  }

  async processQRFromImage(image: any, type: 'masuk' | 'keluar') {
    try {
      // Pada implementasi sebenarnya, Anda perlu menggunakan library untuk membaca QR code dari gambar
      // Karena keterbatasan Capacitor Barcode Scanner yang hanya bisa scan dari kamera langsung
      
      // Untuk saat ini, kita akan menampilkan pesan bahwa fitur ini belum diimplementasikan sepenuhnya
      this.presentAlert(
        'Fitur dalam Pengembangan',
        'Scan QR dari galeri sedang dalam tahap pengembangan. Silakan gunakan scan kamera langsung untuk saat ini.'
      );

      // Setelah berhasil membaca QR, navigasi ke halaman yang sesuai
      // this.router.navigate([`/satpam/beranda/kunjungantamu/tamu-${type}`]);
    } catch (error) {
      console.error('Error processing QR from image:', error);
      this.presentToast('Gagal memproses QR code dari gambar', 'danger');
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