import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { TabHistoryService } from '../services/tab-history.service';
import { PinAuthService } from '../services/pin-auth.service';
import { ChatService } from '../services/chat.service';

@Component({
  selector: 'app-warga',
  templateUrl: './warga.page.html',
  styleUrls: ['./warga.page.scss'],
  standalone: false,
})
export class WargaPage implements OnInit {

  chatUnreadCount = 0;

  constructor(
    private platform: Platform,
    private router: Router,
    private tabHistory: TabHistoryService,
    private pinAuthService: PinAuthService,
    private chatService: ChatService
  ) {
    this.platform.backButton.subscribeWithPriority(10, () => {
      const prevUrl = this.tabHistory.pop();
      if (prevUrl) {
        this.router.navigateByUrl(prevUrl);
      } else {
        // App.exitApp(); // atau biarkan default
      }
    });

    // Subscribe unread count
    this.chatService.unreadCount$.subscribe(count => {
      this.chatUnreadCount = count;
    });
  }

  ngOnInit() {
    // Tidak perlu memanggil checkPinAuth() di sini
    // Service PinAuth akan menangani autentikasi secara otomatis
  }

  ionViewWillEnter() {
    // Tidak perlu memanggil checkPinAuth() di sini
    // Service PinAuth akan menangani autentikasi secara otomatis
  }

  private comingFromLogin(): boolean {
    // Cek apakah user baru saja login (dalam 5 menit terakhir)
    const lastLoginTime = parseInt(localStorage.getItem('last_login_time') || '0');
    const currentTime = new Date().getTime();
    const fiveMinutes = 5 * 60 * 1000;
    return (currentTime - lastLoginTime) < fiveMinutes;
  }

  navigateTo(event: Event, path: string) {
    event.preventDefault();
    this.router.navigateByUrl(path);
  }

  onTabClick(tab: string) {
    const url = `/warga/${tab}`;
    this.tabHistory.setActiveTab(tab);
    this.tabHistory.reset(tab, url);
    this.router.navigateByUrl(url);
  }

  /**
   * Metode untuk logout dari aplikasi
   * Menghapus semua data dari localStorage dan navigasi ke halaman login
   */
  logout(): void {
    // Tambahkan flag untuk menandai bahwa ini adalah proses logout
    // Ini akan membantu halaman login mengetahui bahwa user datang dari proses logout
    localStorage.setItem('is_logout', 'true');
    
    // Reset autentikasi PIN
    this.pinAuthService.resetAuthentication();
    
    // Hapus semua data dari localStorage
    localStorage.clear();
    
    // Alternatif: hapus item spesifik jika ingin menyimpan beberapa preferensi
    // localStorage.removeItem('user');
    // localStorage.removeItem('token');
    // localStorage.removeItem('last_login_time');
    // localStorage.removeItem('fingerprint_status');
    // localStorage.removeItem('fingerprint_status_time');
    // localStorage.removeItem('device_fingerprint_support');
    
    // Navigasi ke halaman login
    this.router.navigate(['/login']);
  }
}
