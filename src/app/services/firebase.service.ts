import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

// Import Firebase
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private firebaseConfig = {
    apiKey: "AIzaSyC0H9zSOATNOrwSqLuCPRay-2RaZIlXQ0I",
    authDomain: "buana-asri-cluster.firebaseapp.com",
    projectId: "buana-asri-cluster",
    storageBucket: "buana-asri-cluster.firebasestorage.app",
    messagingSenderId: "331708364468",
    appId: "1:331708364468:web:7ffa4b2cfa2ce756f5c9e1"
  };

  private app = initializeApp(this.firebaseConfig);
  private messaging: any;

  constructor(
    private http: HttpClient,
    private platform: Platform,
    private router: Router
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    // Firebase sudah diinisialisasi di constructor
    try {
      console.log('Firebase initialized');
      
      // Check if browser supports messaging
      if (this.isSupportedBrowser()) {
        this.messaging = getMessaging(this.app);
        
        // Setup onMessage untuk menangani pesan saat aplikasi terbuka/active
        onMessage(this.messaging, (payload: any) => {
          console.log('Message received in foreground: ', payload);
          this.showNotification(payload);
        });
      }
    } catch (error) {
      console.error('Error initializing Firebase:', error);
    }
  }

  // Check if browser supports Firebase messaging
  private isSupportedBrowser(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    return 'Notification' in window && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
  }

  /**
   * Mendapatkan FCM token dan mengirimkannya ke server
   */
  async getFCMToken(): Promise<string | null> {
    try {
      // Cek apakah browser mendukung notifikasi
      if (!this.isSupportedBrowser()) {
        console.log('Browser tidak mendukung notifikasi');
        return null;
      }

      // Pastikan messaging telah diinisialisasi
      if (!this.messaging) {
        this.messaging = getMessaging(this.app);
      }

      // Cek izin notifikasi
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Izin notifikasi tidak diberikan');
          return null;
        }
      }

      try {
        // Dapatkan FCM token
        const currentToken = await getToken(this.messaging, {
          vapidKey: environment.vapidKey
        });

        if (currentToken) {
          console.log('FCM Token:', currentToken);
          // Simpan token di local storage
          localStorage.setItem('fcm_token', currentToken);
          // Update token di server
          this.updateTokenInServer(currentToken);
          return currentToken;
        } else {
          console.log('Tidak dapat mendapatkan token');
          return null;
        }
      } catch (tokenError) {
        console.error('Error getting FCM token:', tokenError);
        
        // Fallback: Gunakan token dari localStorage jika ada
        const savedToken = localStorage.getItem('fcm_token');
        if (savedToken) {
          console.log('Menggunakan token yang tersimpan:', savedToken);
          return savedToken;
        }
        
        return null;
      }
    } catch (error) {
      console.error('Error in getFCMToken:', error);
      return null;
    }
  }

  /**
   * Update token di server
   */
  updateTokenInServer(token: string): Observable<any> {
    const userData = localStorage.getItem('user');
    if (!userData) {
      console.log('User data tidak ditemukan di localStorage');
      return of(null);
    }

    try {
      const user = JSON.parse(userData);
      const userId = user.users_id;

      // Kirim token ke API
      return this.http.post(`${environment.apiUrl}/api/user/update-fcm-token`, {
        users_id: userId,
        fcm_token: token
      }).pipe(
        map(response => {
          console.log('FCM token berhasil diupdate di server:', response);
          return response;
        }),
        catchError(error => {
          console.error('Error updating FCM token in server:', error);
          return of(null);
        })
      );
    } catch (error) {
      console.error('Error parsing user data:', error);
      return of(null);
    }
  }

  /**
   * Menampilkan notifikasi
   */
  private showNotification(payload: any) {
    const notificationTitle = payload.notification?.title || 'Notifikasi Baru';
    const notificationOptions = {
      body: payload.notification?.body || 'Anda menerima notifikasi baru',
      icon: 'assets/icons/icon-72x72.png',
      badge: 'assets/icons/badge-icon.png',
      data: payload.data
    };

    // Cek jika browser mendukung notifikasi dan izin sudah diberikan
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(notificationTitle, notificationOptions);
      
      // Handle saat notifikasi diklik
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        // Navigate ke halaman terkait jika ada
        if (payload.data && payload.data.halaman) {
          this.router.navigateByUrl(payload.data.halaman);
        }
      };
    }
  }
} 