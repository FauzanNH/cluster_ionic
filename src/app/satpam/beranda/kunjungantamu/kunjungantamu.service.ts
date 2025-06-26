import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface KunjunganResponse {
  success: boolean;
  data: KunjunganTamu[];
  message?: string;
}

export interface KunjunganDetailResponse {
  success: boolean;
  data: KunjunganTamu;
  message?: string;
}

export interface KunjunganTamu {
  id_kunjungan: string;
  nama_tamu: string;
  tanggal: string;
  tujuan: string;
  status: 'Sedang Berlangsung' | 'Meninggalkan Cluster' | 'Menunggu Menuju Cluster';
  blok: string;
  waktu_masuk: string;
  waktu_keluar?: string;
  tamu_id: string;
  rumah_id: string;
  created_at: string;
  updated_at?: string;
}

export interface UpdateStatusResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class KunjungantamuService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getKunjunganList(): Observable<KunjunganResponse> {
    return this.http.get<KunjunganResponse>(`${this.apiUrl}/api/satpam/kunjungan/list`)
      .pipe(
        tap(
          response => console.log('API Response Success:', response),
          error => console.error('API Response Error:', error)
        )
      );
  }

  getKunjunganById(kunjunganId: string): Observable<KunjunganDetailResponse> {
    return this.http.get<KunjunganDetailResponse>(`${this.apiUrl}/api/satpam/kunjungan/${kunjunganId}`);
  }

  tamuMasuk(kunjunganId: string): Observable<UpdateStatusResponse> {
    return this.http.post<UpdateStatusResponse>(`${this.apiUrl}/api/satpam/kunjungan/tamu-masuk`, { kunjungan_id: kunjunganId });
  }

  tamuKeluar(kunjunganId: string): Observable<UpdateStatusResponse> {
    return this.http.post<UpdateStatusResponse>(`${this.apiUrl}/api/satpam/kunjungan/tamu-keluar`, { kunjungan_id: kunjunganId });
  }
} 