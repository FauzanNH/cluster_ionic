import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TamuService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Memproses OCR KTP
  processKtpOcr(image: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', image);

    return this.http.post(`${this.apiUrl}/api/satpam/ocr/process-ktp`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Membuat data tamu baru
  createTamu(tamuData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/satpam/tamu/store`, tamuData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Mendapatkan data tamu berdasarkan ID
  getTamuById(tamuId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/satpam/tamu/${tamuId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Menangani error dari HTTP request
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Terjadi kesalahan yang tidak diketahui';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 422) {
        // Validation error
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error && error.error.errors) {
          const firstError = Object.values(error.error.errors)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
        } else {
          errorMessage = 'Validasi gagal. Silakan periksa data yang dimasukkan.';
        }
      } else if (error.status === 0) {
        errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda.';
      } else {
        errorMessage = `Kode Error: ${error.status}, Pesan: ${error.message}`;
      }
    }
    
    console.error('Error in TamuService:', error);
    return throwError({ status: error.status, message: errorMessage });
  }
} 