import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ActionSheetController, Platform } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-tambahsurat',
  templateUrl: './tambahsurat.page.html',
  styleUrls: ['./tambahsurat.page.scss'],
  standalone: false,
})
export class TambahsuratPage implements OnInit {
  form: FormGroup;
  wargaOptions: any[] = [];
  isLoading = false;
  fileMap: any = {};

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private actionSheetCtrl: ActionSheetController,
    private platform: Platform
  ) {
    this.form = this.fb.group({
      warga_id: ['', Validators.required],
      jenis_surat: ['', Validators.required],
      keperluan_keramaian: [''],
      tempat_keramaian: [''],
      tanggal_keramaian: [''],
      jam_keramaian: [''],
    });
  }

  ngOnInit() {
    this.getWarga();
    this.form.get('jenis_surat')?.valueChanges.subscribe(val => {
      if (val === 'Surat Izin Keramaian') {
        this.form.get('keperluan_keramaian')?.setValidators([Validators.required]);
        this.form.get('tempat_keramaian')?.setValidators([Validators.required]);
        this.form.get('tanggal_keramaian')?.setValidators([Validators.required]);
        this.form.get('jam_keramaian')?.setValidators([Validators.required]);
      } else {
        this.form.get('keperluan_keramaian')?.clearValidators();
        this.form.get('tempat_keramaian')?.clearValidators();
        this.form.get('tanggal_keramaian')?.clearValidators();
        this.form.get('jam_keramaian')?.clearValidators();
      }
      this.form.get('keperluan_keramaian')?.updateValueAndValidity();
      this.form.get('tempat_keramaian')?.updateValueAndValidity();
      this.form.get('tanggal_keramaian')?.updateValueAndValidity();
      this.form.get('jam_keramaian')?.updateValueAndValidity();
    });
  }

  refreshData(event: any) {
    this.getWarga();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  getFileName(field: string): string {
    if (!this.fileMap[field]) return '';
    const file = this.fileMap[field];
    // Jika nama file terlalu panjang, potong dan tambahkan ...
    return file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
  }

  get isKeramaian() {
    return this.form.get('jenis_surat')?.value === 'Surat Izin Keramaian';
  }

  getWarga() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const users_id = user.users_id;
    const rumah_id = user.rumah_id;
    this.http.get<any[]>(`${environment.apiUrl}/api/warga/anggota-rumah?users_id=${users_id}&rumah_id=${rumah_id}`).subscribe(res => {
      this.wargaOptions = res;
    });
  }

  onFileChange(event: any, field: string) {
    if (event.target.files && event.target.files.length > 0) {
      this.fileMap[field] = event.target.files[0];
    }
  }

  async submit() {
    // Validasi file upload wajib
    if (!this.fileMap['foto_ktp'] || !this.fileMap['kartu_keluarga']) {
      const alert = await this.alertCtrl.create({
        header: 'Lengkapi Data',
        message: 'Upload KTP dan KK wajib diisi!',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }
    if (this.form.invalid) return;
    this.isLoading = true;
    const loading = await this.loadingCtrl.create({ message: 'Mengirim data' });
    await loading.present();

    const formData = new FormData();
    // Ambil warga_id dan rumah_id dari localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.warga_id) {
      this.form.get('warga_id')?.setValue(user.warga_id);
    }
    if (user && user.rumah_id) {
      formData.append('rumah_id', user.rumah_id);
    }

    Object.keys(this.form.value).forEach(key => {
      if (this.form.value[key]) formData.append(key, this.form.value[key]);
    });
    // append files
    Object.keys(this.fileMap).forEach(key => {
      if (this.fileMap[key]) formData.append(key, this.fileMap[key]);
    });

    this.http.post(`${environment.apiUrl}/api/warga/suratpengajuan`, formData).subscribe({
      next: async (res: any) => {
        this.isLoading = false;
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: 'Berhasil',
          message: 'Pengajuan surat berhasil dikirim!',
          buttons: [{ text: 'OK', handler: () => this.router.navigate(['/warga/dokumen']) }]
        });
        await alert.present();
      },
      error: async (err) => {
        this.isLoading = false;
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: 'Gagal',
          message: 'Pengajuan surat gagal. Silakan cek data dan coba lagi.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  async presentMediaOptions(field: string) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Pilih Sumber Media',
      buttons: [
        {
          text: 'Ambil Foto',
          icon: 'camera-outline',
          handler: () => this.takePhoto(field)
        },
        {
          text: 'Pilih dari Galeri',
          icon: 'image-outline',
          handler: () => this.pickFromGallery(field)
        },
        {
          text: 'Pilih dari File Manager',
          icon: 'folder-outline',
          handler: () => this.pickFromFileManager(field)
        },
        {
          text: 'Batal',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async takePhoto(field: string) {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });
    // Convert to file
    const blob = await (await fetch(image.dataUrl!)).blob();
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: blob.type });
    this.fileMap[field] = file;
  }

  async pickFromGallery(field: string) {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });
    const blob = await (await fetch(image.dataUrl!)).blob();
    const file = new File([blob], `gallery_${Date.now()}.jpg`, { type: blob.type });
    this.fileMap[field] = file;
  }

  pickFromFileManager(field: string) {
    // Trigger hidden input file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (event: any) => this.onFileChange(event, field);
    input.click();
  }
}
