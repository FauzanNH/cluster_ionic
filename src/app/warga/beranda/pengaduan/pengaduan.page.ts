import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pengaduan',
  templateUrl: './pengaduan.page.html',
  styleUrls: ['./pengaduan.page.scss'],
  standalone: false,
})
export class PengaduanPage implements OnInit {
  allPengaduan: any[] = [];
  pengaduanList: any[] = [];
  selectedFilter: string = 'semua';
  isLoading: boolean = false;
  searchQuery: string = '';

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    const userStr = localStorage.getItem('user');
    let users_id = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        users_id = user.users_id || user.id || '';
      } catch (e) {}
    }
    if (!users_id) {
      this.allPengaduan = [];
      this.pengaduanList = [];
      this.isLoading = false;
      return;
    }
    this.http.get<any>(`${environment.apiUrl}/api/warga/pengaduan/list?users_id=${users_id}`).subscribe({
      next: (res) => {
        // Sesuaikan mapping field jika perlu
        this.allPengaduan = (res.data || []).map((item: any) => ({
          id: item.pengaduan_id,
          jenis: item.jenis_pengaduan,
          status: item.status_pengaduan,
          judul: item.jenis_pengaduan, // atau item.judul jika ada
          deskripsi: item.detail_pengaduan,
          tanggal: item.created_at ? this.formatTanggal(item.created_at) : ''
        }));
        this.pengaduanList = [...this.allPengaduan];
        this.isLoading = false;
      },
      error: () => {
        this.allPengaduan = [];
        this.pengaduanList = [];
        this.isLoading = false;
      }
    });
  }

  formatTanggal(dateStr: string): string {
    const d = new Date(dateStr);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  filterItems(filter: string) {
    this.selectedFilter = filter;
    
    if (filter === 'semua') {
      this.pengaduanList = [...this.allPengaduan];
    } else {
      this.pengaduanList = this.allPengaduan.filter(
        item => item.jenis.toLowerCase() === filter
      );
    }
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
    this.applySearch();
  }

  applySearch() {
    if (this.searchQuery.trim() === '') {
      this.filterItems(this.selectedFilter);
      return;
    }
    
    // Filter berdasarkan kata kunci
    const filtered = this.allPengaduan.filter((item) =>
      item.judul?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      item.jenis?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      item.id?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      item.deskripsi?.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
    
    // Terapkan filter jenis jika bukan 'semua'
    if (this.selectedFilter !== 'semua') {
      this.pengaduanList = filtered.filter(
        item => item.jenis.toLowerCase() === this.selectedFilter
      );
    } else {
      this.pengaduanList = filtered;
    }
  }

  goBack() {
    this.router.navigate(['/warga/beranda']);
  }

  refreshData(event: any) {
    this.loadData();
    if (event) {
      event.target.complete();
    }
  }
}
