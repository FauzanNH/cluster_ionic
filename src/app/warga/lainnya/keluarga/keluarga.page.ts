import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface FamilyMember {
  id: string;
  name: string;
  nik: string;
  relationship: string;
  birthDate: string;
  gender: string;
}

@Component({
  selector: 'app-keluarga',
  templateUrl: './keluarga.page.html',
  styleUrls: ['./keluarga.page.scss'],
  standalone: false,
})
export class KeluargaPage implements OnInit {
  rumahId: string | null = null;
  noKK: string = '';
  statusKepemilikan: string = '';
  isLoading: boolean = true;
  anggota: any[] = [];
  kepalaKeluargaId: string | null = null;
  totalAnggota: number = 0;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadRumahInfo();
  }

  loadRumahInfo() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      this.isLoading = false;
      return;
    }
    const user = JSON.parse(userStr);
    this.rumahId = user.rumah_id;

    if (!this.rumahId) {
      this.isLoading = false;
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/api/rumah/${this.rumahId}/info`).subscribe({
      next: (res) => {
        if (res.success) {
          this.noKK = res.data.no_kk;
          this.statusKepemilikan = res.data.status_kepemilikan;
          this.kepalaKeluargaId = res.data.warga_id1 ? String(res.data.warga_id1) : null;

          // Pastikan semua warga_id bertipe string
          let anggota = (res.data.anggota || []).map((a: any) => ({
            ...a,
            warga_id: String(a.warga_id)
          }));

          // Urutkan sesuai urutan warga_id1-5
          const urutanWargaId: string[] = (res.data.urutan_warga_id || []).map((id: any) => String(id));
          anggota = urutanWargaId
            .map(id => anggota.find((a: any) => a.warga_id === id))
            .filter((a): a is any => !!a);

          this.anggota = anggota;
          this.totalAnggota = res.data.total_anggota || 0;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
      }
    });
  }

  ionViewWillEnter() {}

  editMember(memberId: string) {
    console.log('Edit member:', memberId);
  }

  addNewMember() {
    console.log('Add new member');
  }

  getGenderLabel(gender: string) {
    if (!gender) return '-';
    if (gender.toLowerCase() === 'l') return 'Laki-laki';
    if (gender.toLowerCase() === 'p') return 'Perempuan';
    return gender;
  }
}
