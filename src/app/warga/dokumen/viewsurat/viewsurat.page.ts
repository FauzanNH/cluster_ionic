import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-viewsurat',
  templateUrl: './viewsurat.page.html',
  styleUrls: ['./viewsurat.page.scss'],
  standalone: false,
})
export class ViewsuratPage implements OnInit {
  surat: any = null;
  isLoading = true;
  surat_id: string | null = null;

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient, 
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.surat_id = this.route.snapshot.paramMap.get('surat_id');
    this.loadData();
  }

  loadData() {
    if (this.surat_id) {
      this.isLoading = true;
      this.http.get<any>(`${environment.apiUrl}/api/warga/viewsurat/${this.surat_id}`).subscribe({
        next: (res) => {
          this.surat = res.data;
          this.isLoading = false;
        },
        error: () => {
          this.surat = null;
          this.isLoading = false;
        }
      });
    }
  }

  refreshData(event: any) {
    this.loadData();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  async cancelSurat() {
    this.isLoading = true;
    
    if (this.surat_id) {
      this.http.delete<any>(`${environment.apiUrl}/api/warga/suratpengajuan/${this.surat_id}`).subscribe({
        next: async (res) => {
          this.isLoading = false;
          await this.showToast('Pengajuan surat berhasil dibatalkan', 'success');
          this.router.navigate(['/warga/dokumen']);
        },
        error: async () => {
          this.isLoading = false;
          await this.showToast('Gagal membatalkan pengajuan surat', 'danger');
        }
      });
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
}
