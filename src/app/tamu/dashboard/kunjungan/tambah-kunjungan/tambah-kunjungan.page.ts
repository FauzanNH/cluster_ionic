import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-tambah-kunjungan',
  templateUrl: './tambah-kunjungan.page.html',
  styleUrls: ['./tambah-kunjungan.page.scss'],
  standalone: false,
})
export class TambahKunjunganPage implements OnInit {
  form: FormGroup;
  isLoading = false;
  isSearching = false;
  searchErrorMessage = '';
  tamuData: any;
  searchTerm: string = '';
  rumahOptions: any[] = [];
  selectedRumah: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastCtrl: ToastController,
    private http: HttpClient,
    private loadingCtrl: LoadingController
  ) {
    this.form = this.fb.group({
      rumah_id: ['', Validators.required],
      tujuan_kunjungan: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Ambil data tamu dari localStorage
    const tamuString = localStorage.getItem('tamu_data');
    if (tamuString) {
      try {
        this.tamuData = JSON.parse(tamuString);
        console.log('Tamu data loaded:', this.tamuData);
      } catch (error) {
        console.error('Error parsing tamu data:', error);
        this.router.navigate(['/login-tamu']);
      }
    } else {
      // Coba cari dengan key lain
      const tamuAlt = localStorage.getItem('tamu');
      if (tamuAlt) {
        try {
          this.tamuData = JSON.parse(tamuAlt);
          console.log('Tamu data loaded (alt):', this.tamuData);
        } catch (error) {
          console.error('Error parsing alt tamu data:', error);
          this.router.navigate(['/login-tamu']);
        }
      } else {
        // Jika tidak ada data tamu, redirect ke login
        console.error('No tamu data found in localStorage');
        this.router.navigate(['/login-tamu']);
      }
    }
    
    // Setup search debounce
    this.form.get('rumah_id')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(value => {
        if (value && value.length > 2) {
          this.searchRumah(value);
        } else {
          this.rumahOptions = [];
        }
      });
  }

  // Metode baru untuk menangani pemilihan rumah
  selectRumah(rumahId: string) {
    const selectedOption = this.rumahOptions.find(option => option.rumah_id === rumahId);
    if (selectedOption) {
      this.selectedRumah = selectedOption;
      const rumahIdControl = this.form.get('rumah_id');
      if (rumahIdControl) {
        rumahIdControl.setValue(rumahId);
        // Kosongkan daftar opsi setelah memilih
        this.rumahOptions = [];
        // Hapus pesan error jika ada
        this.searchErrorMessage = '';
      }
    }
  }

  searchRumah(term: string) {
    if (term.length < 3) {
      this.searchErrorMessage = 'Masukkan minimal 3 karakter untuk mencari';
      this.rumahOptions = [];
      return;
    }

    this.searchErrorMessage = '';
    this.isSearching = true;
    this.http.post(`${environment.apiUrl}/api/tamu/kunjungan/search-rumah`, { search: term })
      .subscribe({
        next: (res: any) => {
          this.isSearching = false;
          console.log('Search result:', res); // Debug log
          if (res.success && res.data && Array.isArray(res.data)) {
            if (res.data.length === 0) {
              this.searchErrorMessage = 'Tidak ada hasil yang ditemukan untuk "' + term + '"';
            }
            // Gunakan format data yang sudah disiapkan dari backend
            this.rumahOptions = res.data.map((item: any) => {
              console.log('Item from API:', item); // Log each item
              return {
                rumah_id: item.rumah_id || '',
                users_id: item.users_id || '',
                nama: item.nama || 'Tidak diketahui',
                alamat: item.alamat || item.alamat_cluster || '',
                blok_rt: item.blok_rt || '',
                no_hp: item.no_hp || '-'
              };
            });
            console.log('Formatted options:', this.rumahOptions); // Log final formatted data
          } else {
            this.rumahOptions = [];
            this.searchErrorMessage = 'Tidak ada hasil yang ditemukan';
          }
        },
        error: (err) => {
          console.error('Search error:', err); // Debug log
          this.isSearching = false;
          this.rumahOptions = [];
          this.searchErrorMessage = 'Terjadi kesalahan saat mencari. Silakan coba lagi.';
        }
      });
  }

  refreshData(event: any) {
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  async submit() {
    if (this.form.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        control?.markAsTouched();
      });
      this.showErrorToast('Silahkan lengkapi semua data yang diperlukan');
      return;
    }

    const rumahId = this.form.value.rumah_id;
    // Validasi tambahan untuk memastikan rumah yang dipilih valid
    if (!this.selectedRumah || this.selectedRumah.rumah_id !== rumahId) {
      this.searchErrorMessage = 'Pilih alamat tujuan yang valid dari daftar yang tersedia';
      this.showErrorToast('Alamat tujuan tidak valid. Silakan pilih dari daftar hasil pencarian.');
      return;
    }

    if (!this.tamuData || !this.tamuData.tamu_id) {
      this.showErrorToast('Data tamu tidak valid, silakan login kembali');
      this.router.navigate(['/login-tamu']);
      return;
    }

    this.isLoading = true;

    const loading = await this.loadingCtrl.create({
      message: 'Menambahkan kunjungan...',
      spinner: 'crescent'
    });
    await loading.present();

    // Siapkan data untuk dikirim ke API
    const kunjunganData = {
      tamu_id: this.tamuData.tamu_id,
      rumah_id: this.form.value.rumah_id,
      tujuan_kunjungan: this.form.value.tujuan_kunjungan
    };

    console.log('Submitting data:', kunjunganData);

    // Kirim data ke API
    this.http.post(`${environment.apiUrl}/api/tamu/kunjungan/store`, kunjunganData).subscribe({
      next: async (response: any) => {
        this.isLoading = false;
        loading.dismiss();
        
        if (response.success) {
          const toast = await this.toastCtrl.create({
            message: 'Kunjungan berhasil ditambahkan!',
            duration: 2000,
            color: 'success',
            position: 'bottom'
          });
          await toast.present();
          
          // Simpan flag di localStorage untuk memberitahu halaman kunjungan perlu refresh
          localStorage.setItem('refresh_kunjungan', 'true');
          
          // Navigate back to kunjungan list
          this.router.navigate(['/tamu/dashboard/kunjungan']);
        } else {
          this.showErrorToast(response.message || 'Gagal menambahkan kunjungan');
        }
      },
      error: async (error) => {
        this.isLoading = false;
        loading.dismiss();
        console.error('Error submitting data:', error);
        this.showErrorToast(error.error?.message || 'Terjadi kesalahan saat menambahkan kunjungan');
      }
    });
  }

  async showErrorToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }
}
