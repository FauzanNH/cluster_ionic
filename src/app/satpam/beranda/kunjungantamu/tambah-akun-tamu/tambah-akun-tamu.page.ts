import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController, Platform } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { TamuService } from '../../../../services/tamu.service';
import { DomSanitizer } from '@angular/platform-browser';

interface ImageInfo {
  width: number;
  height: number;
  filesize: number;
  filetype: string;
  path?: string;
}

@Component({
  selector: 'app-tambah-akun-tamu',
  templateUrl: './tambah-akun-tamu.page.html',
  styleUrls: ['./tambah-akun-tamu.page.scss'],
  standalone: false,
})
export class TambahAkunTamuPage implements OnInit {
  currentStep = 1;
  totalSteps = 4;
  
  ktpForm!: FormGroup;
  contactForm!: FormGroup;
  
  ktpImage: string | null = null;
  ktpImageFile: File | null = null;
  imageInfo: ImageInfo | null = null;
  
  ocrData: any = null;
  isOcrLoading = false;
  ocrErrorMessage: string = '';
  
  successData: any = null;
  
  constructor(
    private formBuilder: FormBuilder,
    private tamuService: TamuService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private router: Router,
    private platform: Platform,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.initForms();
  }

  initForms() {
    // Form untuk data KTP
    this.ktpForm = this.formBuilder.group({
      nik: ['', [Validators.required, Validators.maxLength(20)]],
      nama: ['', [Validators.required, Validators.maxLength(100)]],
      tempat_lahir: ['', [Validators.required, Validators.maxLength(50)]],
      tgl_lahir: ['', Validators.required],
      kewarganegaraan: ['', [Validators.required, Validators.maxLength(30)]],
      alamat: ['', [Validators.required, Validators.maxLength(255)]],
      rt: ['', [Validators.required, Validators.maxLength(5)]],
      rw: ['', [Validators.required, Validators.maxLength(5)]],
      kel_desa: ['', [Validators.required, Validators.maxLength(50)]],
      kecamatan: ['', [Validators.required, Validators.maxLength(50)]],
      kabupaten: ['', [Validators.required, Validators.maxLength(50)]],
      agama: ['', [Validators.required, Validators.maxLength(20)]],
    });
    
    // Form untuk kontak
    this.contactForm = this.formBuilder.group({
      no_hp: ['', [Validators.required, Validators.maxLength(15)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    });
  }
  
  // Mengambil gambar dari kamera
  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 100, // Tingkatkan kualitas ke 100%
        allowEditing: true, // Izinkan pengeditan untuk pemotongan gambar
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true, // Perbaiki orientasi gambar
        width: 1280, // Set lebar maksimum
        height: 720, // Set tinggi maksimum
      });
      
      if (image && image.webPath) {
        this.ktpImage = image.webPath;
        console.log('Gambar dari kamera berhasil diambil:', image);
        
        // Reset data sebelumnya
        this.imageInfo = null;
        this.ocrErrorMessage = '';
        
        // Convert to file with metadata in filename
        await this.createFileWithMetadata(image, 'ktp_camera');
        
        // Dapatkan info gambar
        await this.getImageDimensions(image.webPath);
        
        // Process OCR automatically
        this.processOcr();
      }
      
    } catch (error: any) {
      console.error('Error taking picture:', error);
      this.showToast('Gagal mengambil gambar: ' + (error.message || 'Error tidak diketahui'));
    }
  }
  
  // Memilih gambar dari galeri
  async selectFromGallery() {
    try {
      const image = await Camera.getPhoto({
        quality: 100, // Tingkatkan kualitas ke 100%
        allowEditing: true, // Izinkan pengeditan untuk pemotongan gambar
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        correctOrientation: true, // Perbaiki orientasi gambar
        width: 1280, // Set lebar maksimum
        height: 720, // Set tinggi maksimum
      });
      
      if (image && image.webPath) {
        this.ktpImage = image.webPath;
        console.log('Gambar dari galeri berhasil dipilih:', image);
        
        // Reset data sebelumnya
        this.imageInfo = null;
        this.ocrErrorMessage = '';
        
        // Convert to file with metadata in filename
        await this.createFileWithMetadata(image, 'ktp_gallery');
        
        // Dapatkan info gambar
        await this.getImageDimensions(image.webPath);
        
        // Process OCR automatically
        this.processOcr();
      }
      
    } catch (error: any) {
      console.error('Error selecting image:', error);
      this.showToast('Gagal memilih gambar: ' + (error.message || 'Error tidak diketahui'));
    }
  }
  
  // Membuat file dengan metadata dalam nama file
  async createFileWithMetadata(image: Photo, prefix: string): Promise<void> {
    try {
      const response = await fetch(image.webPath!);
      const blob = await response.blob();
      
      // Dapatkan data dari form jika sudah diisi
      const formData = this.ktpForm.value;
      
      // Buat metadata untuk nama file
      const now = new Date();
      const timestamp = now.getTime();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      
      // Coba gunakan data dari form jika ada
      const nikPart = formData.nik || '3200000000000001';
      const namaPart = formData.nama ? formData.nama.replace(/\s+/g, '_') : 'NAMA';
      
      // Buat nama file dengan metadata
      const fileName = `${prefix}_${nikPart}_${namaPart}_${dateStr}_${timestamp}.jpg`;
      
      // Buat file dengan nama yang berisi metadata
      this.ktpImageFile = new File([blob], fileName, { type: 'image/jpeg' });
      
      console.log('File gambar dibuat dengan metadata:', this.ktpImageFile.name);
      
    } catch (error) {
      console.error('Error creating file with metadata:', error);
      // Fallback ke metode lama jika gagal
      const response = await fetch(image.webPath!);
      const blob = await response.blob();
      this.ktpImageFile = new File([blob], `${prefix}.jpg`, { type: 'image/jpeg' });
    }
  }

  // Mendapatkan dimensi gambar
  async getImageDimensions(imgUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        console.log('Dimensi gambar:', width, 'x', height);
        
        if (!this.ktpImageFile) {
          resolve();
          return;
        }
        
        // Tambahkan info dimensi dan ukuran file
        this.imageInfo = {
          width,
          height,
          filesize: this.ktpImageFile.size,
          filetype: this.ktpImageFile.type
        };
        
        resolve();
      };
      
      img.onerror = (error) => {
        console.error('Gagal memuat gambar untuk mendapatkan dimensi:', error);
        reject(error);
      };
      
      img.src = imgUrl;
    });
  }
  
  // Handle error pada loading gambar
  onImageError() {
    console.error('Gagal memuat gambar KTP');
    this.showToast('Gagal memuat gambar KTP');
    this.ktpImage = null;
  }
  
  // Memproses OCR pada gambar KTP
  async processOcr() {
    if (!this.ktpImageFile) {
      this.showToast('Silakan pilih gambar KTP terlebih dahulu');
      return;
    }
    
    this.isOcrLoading = true;
    this.ocrErrorMessage = '';
    console.log('Memulai proses OCR dengan file:', this.ktpImageFile);
    
    try {
      const loading = await this.loadingCtrl.create({
        message: 'Memproses KTP...',
        spinner: 'crescent'
      });
      await loading.present();
      
      this.tamuService.processKtpOcr(this.ktpImageFile).subscribe({
        next: (response) => {
          console.log('Hasil OCR:', response);
          loading.dismiss();
          this.isOcrLoading = false;
          
          if (response && response.success) {
            this.ocrData = response.data;
            console.log('Data OCR yang diterima:', this.ocrData);
            
            // Update imageInfo dari respons server jika ada
            if (response.image_info) {
              this.imageInfo = response.image_info;
              console.log('Info gambar diperbarui dari server:', this.imageInfo);
            }
            
            // Mengisi form dengan data OCR
            this.ktpForm.patchValue({
              nik: this.ocrData.nik,
              nama: this.ocrData.nama,
              tempat_lahir: this.ocrData.tempat_lahir,
              tgl_lahir: this.ocrData.tgl_lahir,
              kewarganegaraan: this.ocrData.kewarganegaraan,
              alamat: this.ocrData.alamat,
              rt: this.ocrData.rt,
              rw: this.ocrData.rw,
              kel_desa: this.ocrData.kel_desa,
              kecamatan: this.ocrData.kecamatan,
              kabupaten: this.ocrData.kabupaten,
              agama: this.ocrData.agama,
            });
            
            console.log('Form setelah diisi data OCR:', this.ktpForm.value);
            
            // Lanjut ke step berikutnya
            this.nextStep();
          } else {
            // Jika OCR gagal, tampilkan pesan kesalahan
            console.error('OCR gagal:', response?.message || 'Tidak ada respons dari server');
            this.ocrErrorMessage = response?.message || 'Gagal memproses KTP. Silakan coba lagi atau isi data secara manual.';
            
            // Menampilkan alert kesalahan
            this.showErrorAlert('Proses OCR Gagal', this.ocrErrorMessage);
          }
        },
        error: (error) => {
          console.error('OCR Error:', error);
          loading.dismiss();
          this.isOcrLoading = false;
          
          // Ekstrak pesan error dari response service yang sudah ditangani
          let errorMessage = 'Terjadi kesalahan saat memproses KTP. Silakan coba lagi atau isi data secara manual.';
          
          if (error.message) {
            // Menggunakan pesan yang ditangkap dari HttpErrorResponse oleh service
            errorMessage = error.message;
          } else if (error.status === 0) {
            errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda atau hubungi administrator.';
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }
          
          this.ocrErrorMessage = errorMessage;
          this.showErrorAlert('Proses OCR Gagal', errorMessage);
        }
      });
    } catch (error: any) {
      console.error('Error processing OCR:', error);
      this.isOcrLoading = false;
      const errorMessage = 'Terjadi kesalahan saat memproses KTP: ' + (error.message || 'Error tidak diketahui');
      this.ocrErrorMessage = errorMessage;
      this.showErrorAlert('Proses OCR Gagal', errorMessage);
    }
  }
  
  // Isi data KTP secara manual
  enterDataManually() {
    // Reset form data
    this.ktpForm.reset({
      kewarganegaraan: 'WNI'
    });
    
    // Lanjut ke step 2
    this.nextStep();
  }
  
  // Menyimpan data tamu
  async saveTamu() {
    if (this.contactForm.invalid) {
      this.showToast('Silakan lengkapi data kontak dengan benar');
      return;
    }
    
    try {
      const loading = await this.loadingCtrl.create({
        message: 'Menyimpan data tamu...',
        spinner: 'crescent'
      });
      await loading.present();
      
      // Gabungkan data KTP dan kontak
      const tamuData = {
        ...this.ktpForm.value,
        ...this.contactForm.value
      };
      
      this.tamuService.createTamu(tamuData).subscribe({
        next: (response) => {
          if (response.success) {
            this.successData = response.data;
            this.nextStep(); // Lanjut ke step sukses
          } else {
            this.showToast('Gagal menyimpan data tamu');
          }
          loading.dismiss();
        },
        error: (error) => {
          console.error('Save Tamu Error:', error);
          this.showToast('Terjadi kesalahan saat menyimpan data tamu');
          loading.dismiss();
        }
      });
    } catch (error) {
      console.error('Error saving tamu:', error);
      this.showToast('Terjadi kesalahan saat menyimpan data tamu');
    }
  }
  
  // Navigasi ke step berikutnya
  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }
  
  // Navigasi ke step sebelumnya
  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }
  
  // Kembali ke beranda
  goToHome() {
    this.router.navigate(['/satpam/beranda']);
  }
  
  // Menampilkan toast
  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  // Menampilkan alert error
  async showErrorAlert(title: string, message: string) {
    const alert = await this.alertCtrl.create({
      header: title,
      message: message,
      buttons: [
        {
          text: 'Coba Lagi',
          role: 'cancel'
        },
        {
          text: 'Isi Manual',
          handler: () => {
            this.enterDataManually();
          }
        }
      ]
    });
    
    await alert.present();
  }
}
