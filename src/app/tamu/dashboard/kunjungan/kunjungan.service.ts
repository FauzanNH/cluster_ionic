import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface KunjunganResponse {
  success: boolean;
  data: Kunjungan[];
  message?: string;
}

export interface KunjunganDetailResponse {
  success: boolean;
  data: Kunjungan;
  message?: string;
}

export interface Kunjungan {
  id: number;
  kunjungan_id: string;
  tamu_id: string;
  rumah_id: string;
  tujuan_kunjungan: string;
  status_kunjungan: 'Menunggu Menuju Cluster' | 'Sedang Berlangsung' | 'Meninggalkan Cluster';
  waktu_masuk: string | null;
  waktu_keluar: string | null;
  created_at: string;
  updated_at: string;
  tamu?: any;
  rumah?: any;
}

@Injectable({
  providedIn: 'root'
})
export class KunjunganService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getKunjunganByTamu(tamuId: string): Observable<KunjunganResponse> {
    console.log('Calling API with tamu_id:', tamuId);
    console.log('API URL:', `${this.apiUrl}/api/tamu/kunjungan/list`);
    
    return this.http.post<KunjunganResponse>(`${this.apiUrl}/api/tamu/kunjungan/list`, { tamu_id: tamuId })
      .pipe(
        tap(
          response => console.log('API Response Success:', response),
          error => console.error('API Response Error:', error)
        )
      );
  }

  getKunjunganById(kunjunganId: string): Observable<KunjunganDetailResponse> {
    return this.http.get<KunjunganDetailResponse>(`${this.apiUrl}/api/tamu/kunjungan/${kunjunganId}`);
  }

  createKunjungan(data: { tamu_id: string, rumah_id: string, tujuan_kunjungan: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/tamu/kunjungan/store`, data);
  }
} 