import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, switchMap, filter, take, finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient, private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Jangan tambahkan token untuk login dan refresh
    if (this.isAuthService(request.url)) {
      return next.handle(request);
    }

    // Tambahkan JWT token jika tersedia
    const token = localStorage.getItem('token');
    if (token) {
      // Cek apakah token expired
      const expiration = localStorage.getItem('token_expires');
      if (expiration && Number(expiration) < Date.now()) {
        // Token sudah expired, perlu di-refresh
        if (!this.isRefreshing) {
          return this.handleExpiredToken(request, next);
        } else {
          // Menunggu refresh token selesai
          return this.refreshTokenSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap(token => {
              return next.handle(this.addTokenToRequest(request, token));
            })
          );
        }
      }

      // Token masih valid, tambahkan ke request
      request = this.addTokenToRequest(request, token);
    }
    
    return next.handle(request).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          // Jika ini adalah request update password, jangan handle sebagai error 401
          if (this.isUpdatePasswordRequest(request.url)) {
            console.log('Password update request, not handling 401 as session expired');
            return throwError(() => error);
          }
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }
  
  private addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  private isAuthService(url: string): boolean {
    const authUrls = [
      `${environment.apiUrl}/api/login`,
      `${environment.apiUrl}/api/refresh`
    ];
    
    return authUrls.some(authUrl => url.includes(authUrl));
  }

  private isUpdatePasswordRequest(url: string): boolean {
    const updatePasswordUrls = [
      `${environment.apiUrl}/api/warga/keamanan/update-password`,
      `${environment.apiUrl}/api/satpam/keamanan/update-password`
    ];
    return updatePasswordUrls.some(passwordUrl => url.includes(passwordUrl));
  }
  
  private handleExpiredToken(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);
    
    // Dapatkan credentials dari localStorage jika ada
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      this.isRefreshing = false;
      this.logout();
      return throwError(() => new Error('User data not found'));
    }
    
    const user = JSON.parse(userStr);
    
    return this.http.post<any>(`${environment.apiUrl}/api/refresh`, {}).pipe(
      switchMap((response) => {
        this.isRefreshing = false;
        
        if (response.success) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('token_type', response.token_type);
          localStorage.setItem('token_expires', (Date.now() + (response.expires_in * 1000)).toString());
          
          this.refreshTokenSubject.next(response.token);
          return next.handle(this.addTokenToRequest(request, response.token));
        } else {
          // Refresh token gagal, logout
          this.logout();
          return throwError(() => new Error('Session expired'));
        }
      }),
      catchError((error) => {
        this.isRefreshing = false;
        
        // Jika refresh token gagal, arahkan ke halaman login
        this.logout();
        
        return throwError(() => error);
      }),
      finalize(() => {
        this.isRefreshing = false;
      })
    );
  }
  
  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      return this.handleExpiredToken(request, next);
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          return next.handle(this.addTokenToRequest(request, token));
        }),
        catchError((error) => {
          // Jika masih error 401, logout
          this.logout();
          return throwError(() => error);
        })
      );
    }
  }
  
  private logout(): void {
    console.log('Logging out user due to auth issues');
    localStorage.removeItem('token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('token_expires');
    localStorage.removeItem('user');
    
    // Redirect ke halaman login
    this.router.navigate(['/login']);
  }
}
