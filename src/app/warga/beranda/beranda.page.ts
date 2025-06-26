import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController } from '@ionic/angular';
import { WargaPage } from '../warga.page';
import { RefreshService } from 'src/app/services/refresh.service';

@Component({
  selector: 'app-beranda',
  templateUrl: './beranda.page.html',
  styleUrls: ['./beranda.page.scss'],
  standalone: false,
})
export class BerandaPage implements OnInit {

  user: any = {};
  nama = '';
  rumah_id = '';
  suratStats = this.getDefaultSuratStats();
  totalAnggota = 0;
  totalTamuHariIni = 0;
  isLoading = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertController: AlertController,
    private wargaPage: WargaPage,
    private refreshService: RefreshService
  ) { }

  logout() {
    this.wargaPage.logout();
  }

  ngOnInit() {
    this.refreshService.refresh$.subscribe(() => {
      this.refreshAllData();
    });
  }

  async ionViewWillEnter() {
    await this.refreshAllData();
  }

  private getUserFromStorage() {
    return JSON.parse(localStorage.getItem('user') || '{}');
  }

  private getDefaultSuratStats() {
    return {
      total: 0,
      menunggu_verifikasi: 0,
      sedang_divalidasi: 0,
      disetujui: 0,
      ditolak: 0
    };
  }

  async refreshAllData() {
    this.isLoading = true;
    this.user = this.getUserFromStorage();
    this.nama = '';
    this.rumah_id = '';
    await this.getUserAndRumah();
    await this.getSuratStats();
    await this.getTotalAnggota();
    await this.getTotalTamuHariIni();
    this.isLoading = false;
  }

  async getUserAndRumah() {
    this.user = this.getUserFromStorage();
    try {
      const res: any = await this.http.get(`${environment.apiUrl}/api/warga/${this.user.users_id}/rumah`).toPromise();
      this.nama = res.nama;
      this.rumah_id = res.rumah_id;
    } catch (err) {
      this.nama = 'Data Rumah Belum di daftar kan';
      this.rumah_id = '-';
      await this.showAlert('Peringatan', 'Data Rumah belum di data silahkan di data terlebih dahulu ke RT.');
    }
  }

  async getSuratStats() {
    const rumah_id = this.rumah_id || this.getUserFromStorage().rumah_id;
    if (!rumah_id) return;
    try {
      const res: any = await this.http.get(`${environment.apiUrl}/api/warga/surat-stats-by-rumah?rumah_id=${rumah_id}`).toPromise();
      this.suratStats = res && res.data ? res.data : this.getDefaultSuratStats();
    } catch {
      this.suratStats = this.getDefaultSuratStats();
    }
  }

  async getTotalAnggota() {
    const rumah_id = this.rumah_id || this.getUserFromStorage().rumah_id;
    if (!rumah_id) return;
    try {
      const res: any = await this.http.get(`${environment.apiUrl}/api/rumah/${rumah_id}/anggota`).toPromise();
      this.totalAnggota = res && res.total_anggota !== undefined ? res.total_anggota : 0;
    } catch {
      this.totalAnggota = 0;
    }
  }

  async getTotalTamuHariIni() {
    const rumah_id = this.rumah_id || this.getUserFromStorage().rumah_id;
    if (!rumah_id) return;
    try {
      const res: any = await this.http.get(`${environment.apiUrl}/api/rumah/${rumah_id}/tamu/today`).toPromise();
      this.totalTamuHariIni = res && res.total_tamu !== undefined ? res.total_tamu : 0;
    } catch {
      this.totalTamuHariIni = 0;
    }
  }

  goToDokumen() {
    this.router.navigate(['/warga/dokumen']);
  }

  goToPengumuman() {
    this.router.navigate(['/warga/pengumuman']);
  }

  async refreshData(event: any) {
    await this.refreshAllData();
    if (event) {
      event.target.complete();
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
