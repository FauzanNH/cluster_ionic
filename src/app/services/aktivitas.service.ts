import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Aktivitas {
  aktivitas_id: string;
  users_id: string;
  judul: string;
  sub_judul: string;
  created_at: string;
  updated_at: string;
}

export interface AktivitasResponse {
  success: boolean;
  data: Aktivitas[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AktivitasService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Mendapatkan daftar aktivitas berdasarkan users_id
   * @param usersId - ID user
   */
  getAktivitasByUserId(usersId: string): Observable<AktivitasResponse> {
    return this.http.get<AktivitasResponse>(`${this.apiUrl}/api/aktivitas/by-user/${usersId}`);
  }
} 