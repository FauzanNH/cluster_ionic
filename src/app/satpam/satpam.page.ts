import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { TabHistoryService } from '../services/tab-history.service';
import { PinAuthService } from '../services/pin-auth.service';
import { ChatService } from '../services/chat.service';

@Component({
  selector: 'app-satpam',
  templateUrl: './satpam.page.html',
  styleUrls: ['./satpam.page.scss'],
  standalone: false,
})
export class SatpamPage implements OnInit {
  
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
    
    // Subscribe unread count dari ChatService dengan interval yang lebih responsif
    this.chatService.unreadCount$.subscribe(count => {
      this.updateUnreadBadge(count);
    });
    
    // Refresh unread count setiap 5 detik
    setInterval(() => {
      this.refreshUnreadCount();
    }, 5000);
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
    const url = `/satpam/${tab}`;
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
    localStorage.setItem('is_logout', 'true');
    
    // Reset autentikasi PIN
    this.pinAuthService.resetAuthentication();
    
    // Hapus semua data dari localStorage
    localStorage.clear();
    
    // Navigasi ke halaman login
    this.router.navigate(['/login']);
  }

  /**
   * Update badge angka dan visual jika ada pesan belum dibaca
   */
  private updateUnreadBadge(count: number) {
    console.log('Updating unread badge count:', count);
    
    // Update tampilan secara langsung
    this.chatUnreadCount = count;
    
    // Tambahkan efek visual jika ada pesan baru (optional)
    if (count > 0) {
      const chatTab = document.querySelector('ion-tab-button[tab="chat-satpam"]');
      if (chatTab) {
        // Tambahkan animasi kilatan singkat
        chatTab.classList.add('new-message');
        setTimeout(() => {
          chatTab.classList.remove('new-message');
        }, 1000);
      }
    }
  }
  
  /**
   * Refresh jumlah pesan yang belum dibaca dari server
   */
  private refreshUnreadCount() {
    // Jika halaman chat sedang aktif, tidak perlu refresh
    if (this.router.url.includes('/chat-satpam/viewchat')) {
      return;
    }
    
    // Get chat list untuk memperbarui jumlah pesan belum dibaca
    this.chatService.getSatpamChatList(new Date().getTime())
      .subscribe({
        next: (chats) => {
          const totalUnread = chats.reduce((total, chat) => total + chat.unread, 0);
          this.chatService.setUnreadCount(totalUnread);
        },
        error: (err) => {
          console.warn('Failed to refresh unread count:', err);
        }
      });
  }
}
