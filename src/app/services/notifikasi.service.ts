import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotifikasiService {
  
  constructor(private http: HttpClient) { }

  /**
   * Mendapatkan daftar notifikasi user
   */
  getNotifikasi(users_id: string): Observable<any[]> {
    return this.http.post<any>(`${environment.apiUrl}/api/notifikasi/list`, { users_id }).pipe(
      map(response => {
        if (response.success) {
          return response.data || [];
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching notifications:', error);
        return of([]);
      })
    );
  }

  /**
   * Simpan notifikasi baru
   */
  storeNotifikasi(notifikasi: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/notifikasi/store`, notifikasi).pipe(
      catchError(error => {
        console.error('Error storing notification:', error);
        return of({ success: false, message: 'Gagal menyimpan notifikasi' });
      })
    );
  }
} 