import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-dokumen',
  templateUrl: './dokumen.page.html',
  styleUrls: ['./dokumen.page.scss'],
  standalone: false,
})
export class DokumenPage implements OnInit {
  dokumenList: any[] = [];
  isLoading = false;
  searchQuery: string = '';
  filteredDokumen: any[] = [];
  activeFilter: string = 'semua'; // Default filter adalah 'semua'

  constructor(
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.getDokumen();
  }

  ionViewWillEnter() {
    this.getDokumen();
  }

  async getDokumen() {
    this.isLoading = true;
    
    // Ambil rumah_id dari localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const rumah_id = user.rumah_id;
    this.http.get<any>(`${environment.apiUrl}/api/warga/surat-by-rumah?rumah_id=${rumah_id}`).subscribe({
      next: (res) => {
        this.dokumenList = res.data || [];
        this.applyFilters(); // Gunakan fungsi applyFilters untuk menggabungkan filter kata kunci dan jenis surat
        this.isLoading = false;
      },
      error: () => {
        this.dokumenList = [];
        this.filteredDokumen = [];
        this.isLoading = false;
      }
    });
  }

  onSearchChange(event: any) {
    // Handle input dari native input element
    let searchValue: string;
    
    if (event.target && event.target.value !== undefined) {
      // Native input event
      searchValue = event.target.value;
    } else if (event.detail && event.detail.value !== undefined) {
      // Ion-searchbar event
      searchValue = event.detail.value;
    } else {
      searchValue = '';
    }
    
    this.searchQuery = searchValue;
    this.applyFilters();
  }

  // Fungsi filter berdasarkan jenis surat
  filterByType(type: string) {
    this.activeFilter = type;
    this.applyFilters();
  }

  // Fungsi untuk menggabungkan filter kata kunci dan jenis surat
  applyFilters() {
    // Pertama filter berdasarkan kata kunci
    let result = this.dokumenList;
    
    if (this.searchQuery.trim() !== '') {
      result = result.filter((dokumen) =>
        dokumen.judul?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        dokumen.jenis_surat?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        dokumen.surat_id?.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    
    // Kemudian filter berdasarkan jenis surat (jika tidak 'semua')
    if (this.activeFilter !== 'semua') {
      result = result.filter((dokumen) => 
        dokumen.jenis_surat === this.activeFilter
      );
    }
    
    this.filteredDokumen = result;
  }

  async tambahDokumen() {
    await this.router.navigate(['/warga/dokumen/tambahsurat']);
  }

  lihatDetail(surat_id: string) {
    this.router.navigate(['/warga/dokumen/viewsurat', surat_id]);
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  get isEmpty(): boolean {
    return this.filteredDokumen.length === 0;
  }

  goBack() {
    this.router.navigate(['/warga/beranda']);
  }

  async refreshData(event: any) {
    await this.getDokumen();
    if (event) {
      event.target.complete();
    }
  }
}
