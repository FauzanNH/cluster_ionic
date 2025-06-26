import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface KunjunganTamu {
  id: number;
  kunjungan_id: string;
  tamu_id: string;
  rumah_id: string;
  tujuan_kunjungan: string;
  status_kunjungan: string;
  waktu_masuk: string;
  waktu_keluar: string;
  created_at: string;
  updated_at: string;
  tamu?: any;
  rumah?: any;
  // UI properties
  nama_tamu?: string;
  tanggal?: string;
  status?: string;
  tujuan?: string;
}

@Injectable({
  providedIn: 'root'
})
export class KunjungantamuWargaService {

  constructor(private http: HttpClient) { }

  getKunjunganList(rumah_id: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/warga/kunjungantamu/list`, {
      rumah_id: rumah_id
    });
  }

  getKunjunganDetail(kunjungan_id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/warga/kunjungantamu/detail/${kunjungan_id}`);
  }
} 