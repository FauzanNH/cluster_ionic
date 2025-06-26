import { Component, OnInit, OnDestroy } from '@angular/core';
import { Platform, ModalController } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TabHistoryService } from './services/tab-history.service';
import { PinModalComponent } from './warga/pin-modal/pin-modal.component';
import { FingerprintModalComponent } from './warga/fingerprint-modal/fingerprint-modal.component';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ChatService } from './services/chat.service';
import { FirebaseService } from './services/firebase.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private lastTimeBackPress = 0;
  private timePeriodToExit = 2000;
  private isModalOpen = false;
  private authenticatedRoutes = ['/warga/beranda', '/warga/profile', '/warga/lainnya'];
  private pinModalShown = false;
  private fingerprintModalShown = false;
  private fingerprintChecked = false;
  private fingerprintActive = false;
  private lastFingerprintCheck = 0;
  private fingerprintCheckInterval = 60000; // 1 menit
  private loginGracePeriod = 0; // Diubah menjadi 0 untuk langsung menampilkan PIN
  private lastAuthCheck = 0; // Tambahan: waktu terakhir pengecekan autentikasi
  private chatUpdateSubscription?: Subscription;

  constructor(
    private platform: Platform,
    private router: Router,
    private tabHistory: TabHistoryService,
    private modalCtrl: ModalController,
    private http: HttpClient,
    private chatService: ChatService,
    private firebaseService: FirebaseService
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    this.setupBackButtonHandler();
    this.setupChatUpdates();
    this.setupFirebaseMessaging();
  }

  ngOnDestroy() {
    if (this.chatUpdateSubscription) {
      this.chatUpdateSubscription.unsubscribe();
    }
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Handle native platform features
      if (this.platform.is('capacitor')) {
        // Set status bar style if available
        try {
          // StatusBar handling moved to native code
        } catch (e) {
          console.warn('StatusBar API not available', e);
        }
      }
      
      this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const tabMatch = event.urlAfterRedirects.match(/\/warga\/(beranda|chat|profile|lainnya)/);
        if (tabMatch) {
          this.tabHistory.setActiveTab(tabMatch[1]);
        }
        this.tabHistory.push(event.urlAfterRedirects);

        if (!this.isAuthenticatedRoute(event.url)) {
          this.pinModalShown = false;
          this.fingerprintModalShown = false;
          return;
        }

        if (this.isAuthenticatedRoute(event.url) && this.isLoggedIn() && !this.pinModalShown && !this.fingerprintModalShown) {
          const lastLoginTime = localStorage.getItem('last_login_time');
          const currentTime = new Date().getTime();
          
          const fromLoginPage = localStorage.getItem('from_login_page');
          if (fromLoginPage === 'true') {
            console.log('Baru login, segera tampilkan modal keamanan');
            localStorage.removeItem('from_login_page');
            return;
          }
          
          if (lastLoginTime && (currentTime - parseInt(lastLoginTime)) < this.loginGracePeriod) {
            console.log('Baru saja login, tidak perlu menampilkan modal keamanan');
            return;
          }
          
          if (currentTime - this.lastAuthCheck < 2000) {
            console.log('Baru saja melakukan pengecekan autentikasi, hindari pengecekan berulang');
            return;
          }
          
          this.lastAuthCheck = currentTime;
        }
      });
    });
  }

  // Setup Firebase Messaging dan mendapatkan FCM token
  setupFirebaseMessaging() {
    // Cek apakah pengguna sudah login
    if (this.isLoggedIn()) {
      // Dapatkan FCM token dan perbarui di server
      this.firebaseService.getFCMToken().then(token => {
        console.log('FCM Token:', token);
      }).catch(error => {
        console.error('Error getting FCM token:', error);
      });
    }
  }

  isAuthenticatedRoute(url: string): boolean {
    return this.authenticatedRoutes.some(route => url.startsWith(route));
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('user') && !!localStorage.getItem('token');
  }

  private async checkAndShowFingerprint(currentTime: number) {
    const securitySettings = localStorage.getItem('security');
    this.fingerprintActive = false;
    
    if (securitySettings) {
      try {
        const settings = JSON.parse(securitySettings);
        this.fingerprintActive = settings === 'fingerprint_is_active';
      } catch (e) {
        console.error('Error parsing security settings:', e);
      }
    }
    
    this.fingerprintChecked = true;
    this.lastFingerprintCheck = currentTime;
    
    if (this.fingerprintActive) {
      await this.showFingerprintModal();
    }
  }

  async showFingerprintModal() {
    if (this.fingerprintModalShown || this.isModalOpen) {
      console.log('Modal fingerprint sudah ditampilkan atau ada modal lain terbuka');
      return;
    }
    
    this.fingerprintModalShown = true;
    this.isModalOpen = true;
    
    const modal = await this.modalCtrl.create({
      component: FingerprintModalComponent,
      cssClass: 'fingerprint-modal',
      backdropDismiss: false
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    this.isModalOpen = false;
    
    if (data && data.success) {
      localStorage.setItem('last_login_time', new Date().getTime().toString());
    } else if (data && data.usePinInstead) {
      // Jika pengguna memilih untuk menggunakan PIN sebagai gantinya
      // await this.showPinModal();
    } else if (data && data.cancelled) {
      this.logout();
    }
  }

  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  setupBackButtonHandler() {
    this.platform.backButton.subscribeWithPriority(10, async () => {
      if (this.isModalOpen) {
        const activeModal = await this.modalCtrl.getTop();
        if (activeModal) {
          activeModal.dismiss({ cancelled: true });
          return;
        }
      }

      if (this.router.url === '/warga/beranda' || this.router.url === '/login') {
        if (new Date().getTime() - this.lastTimeBackPress < this.timePeriodToExit) {
          // Gunakan navigator.app.exitApp() jika tersedia
          if (this.platform.is('capacitor') || this.platform.is('cordova')) {
            try {
          (navigator as any).app.exitApp();
            } catch (e) {
              console.warn('exitApp not available', e);
            }
          }
        } else {
          this.lastTimeBackPress = new Date().getTime();
        }
      } else {
        window.history.back();
      }
    });
  }

  setupChatUpdates() {
    this.chatUpdateSubscription = interval(20000).subscribe(() => {
      const userRole = localStorage.getItem('user_role') || '';
      const isLoggedIn = localStorage.getItem('token') || '';
      
      if (!isLoggedIn) return;
      
      if (userRole.toLowerCase() === 'satpam') {
        this.chatService.getSatpamChatList(new Date().getTime()).subscribe({
          next: (chats) => {
            const totalUnread = chats.reduce((total, chat) => total + chat.unread, 0);
            this.chatService.setUnreadCount(totalUnread);
          },
          error: (error) => {
            console.error('Error updating chat unread count:', error);
          }
        });
      } else {
        this.chatService.getChatList(new Date().getTime()).subscribe({
          next: (chats) => {
            const totalUnread = chats.reduce((total, chat) => total + chat.unread, 0);
            this.chatService.setUnreadCount(totalUnread);
          },
          error: (error) => {
            console.error('Error updating chat unread count:', error);
          }
        });
      }
    });
  }
}
