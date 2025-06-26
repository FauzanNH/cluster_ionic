import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { KunjungantamuService } from '../kunjungantamu.service';
import { LoadingController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scan-berhasil',
  templateUrl: './scan-berhasil.component.html',
  styleUrls: ['./scan-berhasil.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ScanBerhasilComponent implements OnInit {
  kunjunganId: string = '';
  tipe: string = ''; // 'masuk' atau 'keluar'
  kunjunganData: any = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private kunjunganService: KunjungantamuService,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.kunjunganId = params['kunjungan_id'];
      this.tipe = params['tipe'];
      this.loadKunjunganData();
    });
  }

  async loadKunjunganData() {
    if (!this.kunjunganId) {
      this.errorMessage = 'ID Kunjungan tidak ditemukan';
      this.isLoading = false;
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Memuat data kunjungan...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      this.kunjunganService.getKunjunganById(this.kunjunganId).subscribe({
        next: (response) => {
          loading.dismiss();
          if (response.success) {
            this.kunjunganData = response.data;
          } else {
            this.errorMessage = 'Gagal memuat data kunjungan';
          }
          this.isLoading = false;
        },
        error: (error) => {
          loading.dismiss();
          console.error('Error loading kunjungan data:', error);
          this.errorMessage = 'Terjadi kesalahan saat memuat data';
          this.isLoading = false;
        }
      });
    } catch (error) {
      loading.dismiss();
      console.error('Error in loadKunjunganData:', error);
      this.errorMessage = 'Terjadi kesalahan saat memuat data';
      this.isLoading = false;
    }
  }

  lihatDetail() {
    this.router.navigate(['/satpam/beranda/kunjungantamu/viewdetail', this.kunjunganId]);
  }

  kembali() {
    this.router.navigate(['/satpam/beranda/kunjungantamu']);
  }
}
