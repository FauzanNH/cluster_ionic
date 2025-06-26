import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationStart } from '@angular/router';
import { environment } from 'src/environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FingerprintAIO } from '@awesome-cordova-plugins/fingerprint-aio/ngx';
import { App } from '@capacitor/app';
import { Storage } from '@ionic/storage-angular';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PinAuthService {
  private _storage: Storage | null = null;
  private _verified = new BehaviorSubject<boolean>(false);
  private _pin = new BehaviorSubject<string | null>(null);
  private _lastVerificationTime = new BehaviorSubject<number | null>(null);
  private verificationTimeWindow: number = 3 * 60 * 1000; // 3 menit dalam milliseconds
  
  // Properties yang hilang
  private isModalOpen: boolean = false;
  private lastVerifiedTime: number = 0;
  private isPinEnabled: boolean = false;
  
  // Key untuk sidik jari di localStorage
  private readonly SECURITY_KEY = 'security';
  private readonly FINGERPRINT_VALUE = 'fingerprint_is_active';
  private readonly LOGIN_TIME_KEY = 'last_login_time';
  private readonly AUTH_VERIFIED_KEY = 'auth_verified';
  private readonly LOGIN_GRACE_PERIOD = 24 * 60 * 60 * 1000; // 24 jam

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private router: Router,
    private faio: FingerprintAIO,
    private storage: Storage
  ) {
    this.init();
    
    // Aktifkan kembali pemanggilan modal PIN hanya pada navigasi pertama setelah login
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      // Hanya periksa untuk halaman login
      if (event.url.includes('/login')) {
        localStorage.setItem('from_login_page', 'true');
      } else if (localStorage.getItem('from_login_page') === 'true' && 
                (event.url.startsWith('/warga') || event.url.startsWith('/satpam'))) {
        this.checkPinOnNavigation(event.url);
      }
    });
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;
    
    // Load stored verification data
    const lastVerificationTime = await this._storage.get('lastVerificationTime');
    if (lastVerificationTime) {
      const now = Date.now();
      const elapsed = now - lastVerificationTime;
      
      // Check if verification is still valid
      if (elapsed < this.verificationTimeWindow) {
        this._verified.next(true);
        this._lastVerificationTime.next(lastVerificationTime);
        this.lastVerifiedTime = lastVerificationTime;
      } else {
        // Clear expired verification
        this._storage.remove('lastVerificationTime');
      }
    }
    
    // Load stored PIN
    const pin = await this._storage.get('pin');
    if (pin) {
      this._pin.next(pin);
    }
    
    // Check PIN status
    await this.checkPinStatus();
  }

  get verified(): Observable<boolean> {
    return this._verified.asObservable();
  }
  
  get pin(): Observable<string | null> {
    return this._pin.asObservable();
  }
  
  get lastVerificationTime(): Observable<number | null> {
    return this._lastVerificationTime.asObservable();
  }
  
  async setPin(pin: string): Promise<void> {
    await this._storage?.set('pin', pin);
    this._pin.next(pin);
  }
  
  async clearPin(): Promise<void> {
    await this._storage?.remove('pin');
    this._pin.next(null);
  }
  
  async verifyPin(enteredPin: string): Promise<boolean> {
    const storedPin = await this._storage?.get('pin');
    
    if (storedPin && storedPin === enteredPin) {
      const now = Date.now();
      await this._storage?.set('lastVerificationTime', now);
      this._lastVerificationTime.next(now);
      this._verified.next(true);
      this.lastVerifiedTime = now;
      return true;
    }
    
    return false;
  }
  
  async checkServerPin(enteredPin: string): Promise<any> {
    return this.http.post(`${environment.apiUrl}/check-pin`, { pin: enteredPin }).pipe(
      tap((response: any) => {
        if (response.success) {
          const now = Date.now();
          this._storage?.set('lastVerificationTime', now);
          this._lastVerificationTime.next(now);
          this._verified.next(true);
          this.lastVerifiedTime = now;
        }
      })
    ).toPromise();
  }
  
  async logout(): Promise<void> {
    await this._storage?.remove('lastVerificationTime');
    this._lastVerificationTime.next(null);
    this._verified.next(false);
    this.lastVerifiedTime = 0;
  }
  
  async isVerificationExpired(): Promise<boolean> {
    const lastVerificationTime = await this._storage?.get('lastVerificationTime');
    
    if (!lastVerificationTime) {
      return true;
    }
    
    const now = Date.now();
    const elapsed = now - lastVerificationTime;
    
    return elapsed >= this.verificationTimeWindow;
  }
  
  getTimeRemaining(): number {
    const lastTime = this._lastVerificationTime.value;
    if (!lastTime) {
      return 0;
    }
    
    const now = Date.now();
    const elapsed = now - lastTime;
    const remaining = Math.max(0, this.verificationTimeWindow - elapsed);
    
    return Math.floor(remaining / 1000); // Return seconds remaining
  }

  private checkPinOnNavigation(url: string) {
    // Kalau modal sudah terbuka, jangan periksa lagi
    if (this.isModalOpen) {
      return;
    }

    // Kalau dalam window verifikasi yang masih berlaku, jangan periksa lagi
    const currentTime = new Date().getTime();
    if (currentTime - this.lastVerifiedTime < this.verificationTimeWindow) {
      return;
    }
    
    // Periksa apakah ini navigasi setelah login
    const fromLogin = localStorage.getItem('from_login_page') === 'true';
    if (fromLogin) {
      localStorage.removeItem('from_login_page');
      if (url.startsWith('/warga') || url.startsWith('/satpam')) {
        // Segera periksa keamanan
        this.checkAuthStatus().then(shouldAuthenticate => {
          if (shouldAuthenticate) {
            if (this.isPinEnabled) {
              this.showPinModal(true); // true menandakan prioritas tinggi
            } else if (this.isFingerprintEnabled()) {
              this.showFingerprintOnlyModal(true); // true menandakan prioritas tinggi
            } else {
              this.setVerified(true);
            }
          }
        });
      }
    }
  }
  
  // Periksa status autentikasi (PIN dan sidik jari)
  private async checkAuthStatus(): Promise<boolean> {
    // Selalu refresh status PIN dari database
    await this.checkPinStatus();
    
    // Periksa juga apakah ada sidik jari yang diaktifkan
    const isFingerprintActive = this.isFingerprintEnabled();
    
    // Perlu autentikasi jika PIN atau sidik jari diaktifkan
    return this.isPinEnabled || isFingerprintActive;
  }
  
  // Periksa apakah sidik jari diaktifkan
  private isFingerprintEnabled(): boolean {
    const securitySettings = localStorage.getItem(this.SECURITY_KEY);
    console.log('Security settings from localStorage:', securitySettings);
    
    if (securitySettings) {
      try {
        // Periksa apakah nilai adalah string JSON yang di-quote atau nilai langsung
        if (securitySettings === '"fingerprint_is_active"' || securitySettings === 'fingerprint_is_active') {
          return true;
        }
        
        const settings = JSON.parse(securitySettings);
        return settings === this.FINGERPRINT_VALUE;
      } catch (e) {
        console.error('Error parsing security settings:', e);
        return false;
      }
    }
    return false;
  }
  
  // Coba autentikasi dengan sidik jari
  private async tryFingerprintAuth() {
    try {
      // Periksa apakah perangkat mendukung sidik jari
      const isAvailable = await this.faio.isAvailable();
      if (!isAvailable) {
        // Jika perangkat tidak mendukung tapi PIN aktif, gunakan PIN
        if (this.isPinEnabled) {
          this.showPinModal();
        } else {
          // Jika PIN juga tidak aktif, anggap terverifikasi
          this.setVerified(true);
        }
        return;
      }
      
      // Tampilkan dialog sidik jari
      await this.faio.show({
        title: 'Autentikasi Sidik Jari',
        description: 'Pindai sidik jari Anda untuk login',
        disableBackup: false,
        cancelButtonTitle: this.isPinEnabled ? 'Gunakan PIN' : 'Batal'
      });
      
      // Jika berhasil, set verified
      this.setVerified(true);
    } catch (error) {
      console.error('Error with fingerprint auth:', error);
      
      if (error === 'Fingerprint authentication canceled') {
        // Jika user membatalkan dan PIN aktif, tampilkan PIN modal
        if (this.isPinEnabled) {
          this.showPinModal();
        } else {
          // Jika PIN tidak aktif, kembali ke halaman login
          this.router.navigate(['/login']);
        }
      } else {
        // Jika error dan PIN aktif
        if (this.isPinEnabled) {
          setTimeout(() => {
            this.showPinModal();
          }, 300);
        } else {
          // Jika PIN tidak aktif, kembali ke halaman login
          this.router.navigate(['/login']);
        }
      }
    }
  }

  private async checkPinStatus(): Promise<boolean> {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      this.isPinEnabled = false;
      return false;
    }

    try {
      const user = JSON.parse(userStr);
      const users_id = user?.users_id;
      
      if (!users_id) {
        this.isPinEnabled = false;
        return false;
      }

      // Ambil status PIN dari server
      const response = await this.http.get<any>(`${environment.apiUrl}/pin-status/${users_id}`).toPromise();

      // Pastikan nilai isPinEnabled diupdate
      this.isPinEnabled = !!(response && response.success && response.pin_security_enabled);
      
      // Log status PIN untuk debugging
      console.log('PIN status dari server:', this.isPinEnabled);
      
      return this.isPinEnabled;
    } catch (error) {
      console.error('Error checking PIN status:', error);
      this.isPinEnabled = false;
      return false;
    }
  }

  async showPinModal(highPriority = false) {
    if (this.isModalOpen || localStorage.getItem('modal_pin_open') === 'true') {
      console.log('Modal PIN sudah terbuka, batalkan permintaan baru');
      return;
    }
    this.isModalOpen = true;
    localStorage.setItem('modal_pin_open', 'true');
    await this.checkPinStatus();
    if (!this.isPinEnabled && this.isFingerprintEnabled()) {
      await this.showFingerprintOnlyModal(highPriority);
      this.isModalOpen = false;
      localStorage.removeItem('modal_pin_open');
      return;
    }
    if (!this.isPinEnabled && !this.isFingerprintEnabled()) {
      this.setVerified(true);
      this.isModalOpen = false;
      localStorage.removeItem('modal_pin_open');
      return;
    }
    
    // Tampilkan modal PIN
    const { PinModalComponent } = await import('../warga/pin-modal/pin-modal.component');
    const modal = await this.modalCtrl.create({
      component: PinModalComponent,
      backdropDismiss: !highPriority,
      componentProps: {
        routeTo: highPriority ? null : '/login'
      },
      cssClass: 'pin-modal'
    });
    
    await modal.present();
    const { data } = await modal.onDidDismiss();
    this.isModalOpen = false;
    localStorage.removeItem('modal_pin_open');
    if (data && data.success) {
      this.setVerified(true);
    } else {
      // Jika user tidak berhasil verifikasi dan ini prioritas tinggi, arahkan ke login
      if (highPriority) {
        this.router.navigate(['/login']);
    }
  }
  }
  
  async showFingerprintOnlyModal(highPriority = false) {
    // Batalkan permintaan jika modal pin sudah terbuka
    if (localStorage.getItem('modal_pin_open') === 'true') {
      return;
    }
    localStorage.setItem('modal_pin_open', 'true');
    
    if (this.isModalOpen) {
      console.log('Modal sidik jari sudah terbuka, batalkan permintaan baru');
      return;
    }
    
    // Periksa apakah sidik jari diaktifkan
    if (!this.isFingerprintEnabled()) {
      console.log('Sidik jari tidak diaktifkan, batalkan permintaan');
      localStorage.removeItem('modal_pin_open');
      return;
    }
    
    // Periksa apakah PIN diaktifkan
    await this.checkPinStatus();
    console.log('PIN aktif:', this.isPinEnabled);
    
    if (this.isPinEnabled) {
      console.log('PIN aktif, menampilkan modal PIN');
      this.showPinModal(highPriority);
      return;
    }
    
    // Jika sidik jari diaktifkan tapi PIN tidak, tampilkan modal khusus sidik jari
    console.log('Menampilkan modal khusus sidik jari');
    
    console.log('Mempersiapkan modal sidik jari...');
    this.isModalOpen = true;
    localStorage.setItem('modal_pin_open', 'true');
    
    try {
      // Tampilkan modal sidik jari
      const { PinModalComponent } = await import('../warga/pin-modal/pin-modal.component');
      const modal = await this.modalCtrl.create({
        component: PinModalComponent,
        backdropDismiss: !highPriority,
        componentProps: {
          routeTo: highPriority ? null : '/login',
          isPinDisabled: true,
          isFingerprintOnlyMode: true
        },
        cssClass: 'pin-modal'
      });
      
      await modal.present();
      
      const { data } = await modal.onDidDismiss();
      
      console.log('Modal sidik jari ditutup dengan data:', data);
      
      this.isModalOpen = false;
      localStorage.removeItem('modal_pin_open');
      
      if (data && data.success) {
        this.setVerified(true);
      } else {
        // Jika user tidak berhasil verifikasi dan ini prioritas tinggi, arahkan ke login
        if (highPriority) {
          this.router.navigate(['/login']);
        }
      }
    } catch (error) {
      console.error('Error saat menampilkan modal sidik jari:', error);
      this.isModalOpen = false;
      localStorage.removeItem('modal_pin_open');
    }
  }

  setVerified(value: boolean) {
    if (value) {
      this.lastVerifiedTime = new Date().getTime();
      localStorage.setItem(this.LOGIN_TIME_KEY, this.lastVerifiedTime.toString());
      localStorage.setItem(this.AUTH_VERIFIED_KEY, 'true');
    } else {
      localStorage.removeItem(this.AUTH_VERIFIED_KEY);
    }
    this._verified.next(value);
  }

  isAuthenticated(): Observable<boolean> {
    return this._verified.asObservable();
  }

  resetAuthentication() {
    this._verified.next(false);
    this.lastVerifiedTime = 0;
    localStorage.removeItem(this.AUTH_VERIFIED_KEY);
    localStorage.removeItem(this.LOGIN_TIME_KEY);
  }
} 