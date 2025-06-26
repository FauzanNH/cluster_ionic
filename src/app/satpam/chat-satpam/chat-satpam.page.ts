import { Component, OnInit, ViewChildren, QueryList, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { ToastController, AlertController, GestureController, IonItem, Gesture, LoadingController, Platform, ModalController } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { ChatService, Chat } from '../../services/chat.service';
import { Subscription, interval } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat-satpam',
  templateUrl: './chat-satpam.page.html',
  styleUrls: ['./chat-satpam.page.scss'],
  standalone: false,
})
export class ChatSatpamPage implements OnInit, AfterViewInit {
  
  @ViewChildren(IonItem, { read: ElementRef }) chatItems!: QueryList<ElementRef>;
  
  chats: Chat[] = [];
  filteredChats: Chat[] = [];
  isSelectionMode: boolean = false;
  isSelectionTransitioning: boolean = false;
  selectedChats: Chat[] = [];
  private gestures: Gesture[] = [];
  private isLongPressActive: boolean = false;
  private lastTapTime: number = 0;
  private transitioning: boolean = false;
  
  // Subscriptions
  private refreshSubscription?: Subscription;
  private totalUnreadSubscription?: Subscription;

  // Loading state
  isLoading: boolean = true;
  noChats: boolean = false;

  // Variabel untuk pencarian
  searchQuery: string = '';

  // Variabel untuk segment
  selectedSegment: string = 'all';

  constructor(
    private toastController: ToastController,
    private alertController: AlertController,
    private gestureCtrl: GestureController,
    private navCtrl: NavController,
    private chatService: ChatService,
    private loadingController: LoadingController,
    private router: Router,
    private platform: Platform,
    private ngZone: NgZone,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.loadChats();
    
    // Setup refresh interval (setiap 5 detik untuk lebih responsif)
    this.refreshSubscription = interval(5000).subscribe(() => {
      this.refreshChatList(false);
    });
    
    // Subscribe ke unread count
    this.totalUnreadSubscription = this.chatService.unreadCount$.subscribe(count => {
      // Update tab badge jika diperlukan
    });
  }

  ngAfterViewInit() {
    this.setupLongPress();
  }

  ngOnDestroy() {
    // Unsubscribe untuk mencegah memory leak
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    
    if (this.totalUnreadSubscription) {
      this.totalUnreadSubscription.unsubscribe();
    }
    
    // Destroy gestures
    if (this.gestures.length > 0) {
      this.gestures.forEach(gesture => gesture.destroy());
      this.gestures = [];
    }
  }

  // Mencari chat berdasarkan query
  searchChats() {
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      this.filteredChats = [...this.chats]; // Tampilkan semua chat jika query kosong
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    
    // Filter berdasarkan nama atau pesan terakhir
    this.filteredChats = this.chats.filter(chat => 
      chat.name.toLowerCase().includes(query) || 
      (chat.lastMessage && chat.lastMessage.toLowerCase().includes(query))
    );
  }

  // Handler untuk perubahan segment (diganti dengan selectSegment)
  selectSegment(value: string) {
    this.selectedSegment = value;
    this.applyFilters();
  }

  // Menerapkan filter berdasarkan segment yang dipilih
  applyFilters() {
    // Tidak perlu filter khusus, semua pesan ditampilkan
    this.filteredChats = [...this.chats];
    
    // Jika ada pencarian aktif, terapkan filter pencarian
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      this.searchChats();
    }
  }

  // Mendapatkan total pesan belum dibaca
  getTotalUnread(): number {
    return this.chats.reduce((total, chat) => total + chat.unread, 0);
  }

  // Memuat daftar chat dari API
  async loadChats() {
    this.isLoading = true;
    
    try {
      // Panggil API untuk mendapatkan daftar chat (endpoint satpam)
      this.chatService.getSatpamChatList(new Date().getTime()).subscribe({
        next: (chats) => {
          this.ngZone.run(() => {
            this.chats = chats;
            this.filteredChats = [...this.chats];
            this.isLoading = false;
            this.noChats = this.chats.length === 0;
            
            // Update unread count di service agar tersedia untuk semua komponen
            const totalUnread = this.getTotalUnread();
            this.chatService.setUnreadCount(totalUnread);
            
            // Setup gesture setelah list diperbarui
            setTimeout(() => this.setupLongPress(), 500);
          });
        },
        error: (error) => {
          console.error('Error loading chats:', error);
          this.isLoading = false;
          this.noChats = true;
          this.presentToast('Gagal memuat chat. Silakan coba lagi.');
        }
      });
    } catch (error) {
      console.error('Error in loadChats:', error);
      this.isLoading = false;
      this.noChats = true;
      this.presentToast('Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  // Refresh daftar chat
  async refreshChatList(showLoading = true) {
    if (showLoading) {
      const loading = await this.loadingController.create({
        message: 'Memperbarui daftar chat...',
        duration: 2000
      });
      await loading.present();
    }
    
    // Panggil API dengan timestamp untuk mencegah caching
    this.chatService.getSatpamChatList(new Date().getTime()).subscribe({
      next: (chats) => {
        this.ngZone.run(() => {
          this.chats = chats;
          this.applyFilters();
          
          if (showLoading) {
            this.loadingController.dismiss();
          }
          
          // Update unread count di service agar tersedia untuk semua komponen
          const totalUnread = this.getTotalUnread();
          this.chatService.setUnreadCount(totalUnread);
          
          // Setup gesture setelah list diperbarui
          setTimeout(() => this.setupLongPress(), 500);
        });
      },
      error: (error) => {
        console.error('Error refreshing chats:', error);
        if (showLoading) {
          this.loadingController.dismiss();
        }
        this.presentToast('Gagal memperbarui chat. Silakan coba lagi.');
      }
    });
  }

  setupLongPress() {
    // Hapus gestures sebelumnya jika ada
    if (this.gestures.length > 0) {
      this.gestures.forEach(gesture => gesture.destroy());
      this.gestures = [];
    }
    
    setTimeout(() => {
      if (this.chatItems) {
        this.chatItems.forEach((item, index) => {
          if (index < this.filteredChats.length) { // Memastikan indeks valid
            const chat = this.filteredChats[index];
            
            const gesture = this.gestureCtrl.create({
              el: item.nativeElement,
              threshold: 0,
              gestureName: 'long-press',
              onStart: () => {
                // Simpan referensi waktu mulai
                const startTime = new Date().getTime();
                this.isLongPressActive = false;
                
                // Handler untuk memeriksa durasi
                const checkDuration = () => {
                  const now = new Date().getTime();
                  const elapsedTime = now - startTime;
                  
                  // Jika sudah menekan selama 500ms atau lebih
                  if (elapsedTime >= 500 && !this.isLongPressActive) {
                    this.isLongPressActive = true;
                    this.handleLongPress(chat);
                    clearInterval(timer);
                    document.removeEventListener('touchend', cancelLongPress);
                  }
                };
                
                // Timer untuk memeriksa secara berkala
                const timer = setInterval(checkDuration, 100);
                
                // Handler untuk membatalkan jika dilepas
                const cancelLongPress = () => {
                  clearInterval(timer);
                  document.removeEventListener('touchend', cancelLongPress);
                };
                
                // Tambahkan listener untuk deteksi lepas
                document.addEventListener('touchend', cancelLongPress, { once: true });
              },
              gesturePriority: 100
            }, true);
            
            gesture.enable(true);
            this.gestures.push(gesture);
          }
        });
      }
    }, 500);
  }

  // Metode untuk menangani tekan lama dengan animasi transisi
  async handleLongPress(chat: Chat) {
    // Mencegah memilih chat saat transisi berlangsung
    if (this.transitioning) return;
    
    this.transitioning = true;
    
    // Aktifkan mode transisi
    this.isSelectionTransitioning = true;
    
    // Aktifkan mode seleksi jika belum aktif
    if (!this.isSelectionMode) {
      this.isSelectionMode = true;
      this.selectedChats = [];
      
      // Reset semua status terpilih
      this.filteredChats.forEach(c => c.selected = false);

      // Pilih item ini
      chat.selected = true;
      this.selectedChats.push(chat);
      
      // Force change detection / refresh UI
      this.filteredChats = [...this.filteredChats];
      
      // Berikan umpan balik haptic/visual
      this.presentToast('Chat dipilih');
      
      // Delay untuk animasi transisi
      setTimeout(() => {
        this.isSelectionTransitioning = false;
        setTimeout(() => {
          this.transitioning = false;
        }, 100);
      }, 300); // Sesuaikan dengan durasi animasi di CSS (0.3s)
    }
  }

  // Refresh gesture detectors saat daftar chat diperbarui
  refreshGestures() {
    setTimeout(() => {
      this.setupLongPress();
    }, 100);
  }

  async openChat(chat: Chat) {
    // Jika dalam mode seleksi, toggle selection daripada membuka chat
    if (this.isSelectionMode) {
      this.toggleSelection(chat);
      return;
    }

    // Navigate ke halaman chat detail
    this.router.navigate(['/satpam/chat-satpam/viewchat-satpam', chat.id]);
  }

  toggleSelection(chat: Chat) {
    if (!this.isSelectionMode || this.isSelectionTransitioning) return;
    
    // Toggle status selected
    chat.selected = !chat.selected;
    
    if (chat.selected) {
      // Tambahkan ke array jika belum ada
      if (!this.selectedChats.find(c => c.id === chat.id)) {
        this.selectedChats.push(chat);
      }
    } else {
      // Hapus dari array jika sudah tidak terpilih
      this.selectedChats = this.selectedChats.filter(c => c.id !== chat.id);
    
      // Jika tidak ada yang terpilih, keluar dari mode seleksi
    if (this.selectedChats.length === 0) {
      this.exitSelectionMode();
      }
    }
  }

  async exitSelectionMode() {
    // Mencegah keluar mode seleksi saat transisi berlangsung
    if (this.isSelectionTransitioning) return;
    
    this.isSelectionTransitioning = true;
    this.transitioning = true;
    
    // Reset semua status terpilih
    this.filteredChats.forEach(chat => chat.selected = false);
    this.selectedChats = [];
    
    // Delay untuk animasi transisi
    setTimeout(() => {
      this.isSelectionMode = false;
      this.isSelectionTransitioning = false;
      
        setTimeout(() => {
          this.transitioning = false;
        }, 100);
    }, 300); // Sesuaikan dengan durasi animasi di CSS (0.3s)
  }

  markSelectedAsRead() {
    if (this.selectedChats.length === 0) return;
    
    // Tandai semua chat yang terpilih sebagai sudah dibaca
    this.selectedChats.forEach(chat => {
      this.markAsRead(chat);
    });
    
    this.exitSelectionMode();
  }

  muteSelectedChats() {
    if (this.selectedChats.length === 0) return;
    
    // Tandai semua chat yang terpilih sebagai dibisukan
    this.selectedChats.forEach(chat => {
      this.muteChat(chat);
    });
    
    this.exitSelectionMode();
  }

  async deleteSelectedChats() {
    if (this.selectedChats.length === 0) return;
    
    const alert = await this.alertController.create({
      header: 'Hapus Chat',
      message: `Apakah Anda yakin ingin menghapus ${this.selectedChats.length} chat ini?`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          handler: () => {
            // Hapus semua chat yang terpilih
            this.selectedChats.forEach(async (chat) => {
              await this.deleteChat(chat);
            });
            
            this.exitSelectionMode();
          }
        }
      ]
    });

    await alert.present();
  }

  async startNewChat() {
    try {
      // Import modal component dengan dynamic import untuk lazy loading
      const { ContactSearchModalComponent } = await import('./contact-search-modal/contact-search-modal.component');
      
      // Buat dan tampilkan modal menggunakan ModalController service
      const modal = await this.modalController.create({
        component: ContactSearchModalComponent,
        cssClass: 'contact-search-modal'
      });
      
      // Handler untuk hasil dari modal
      modal.onDidDismiss().then(result => {
        console.log('Modal dismissed with result:', result);
        
        if (result.role === 'success' && result.data && result.data.chatId) {
          // Navigasi ke halaman chat jika berhasil
          this.navigateToChat(result.data.chatId);
        }
      });
      
      await modal.present();
    } catch (error) {
      console.error('Error creating modal:', error);
      this.presentToast('Gagal membuka modal kontak. Silakan coba lagi.');
          }
        }
  
  // Navigasi ke halaman chat
  navigateToChat(chatId: string) {
    this.router.navigate(['/satpam/chat-satpam/viewchat-satpam', chatId]);
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  doRefresh(event: any) {
    // Refresh daftar chat
    this.chatService.getSatpamChatList(new Date().getTime()).subscribe({
      next: (chats) => {
        this.ngZone.run(() => {
          this.chats = chats;
          this.applyFilters();
      event.target.complete();
      
          // Update unread count
          const totalUnread = this.getTotalUnread();
          this.chatService.setUnreadCount(totalUnread);
          
          // Setup gesture setelah list diperbarui
          setTimeout(() => this.setupLongPress(), 500);
        });
      },
      error: (error) => {
        console.error('Error refreshing chats:', error);
        event.target.complete();
        this.presentToast('Gagal memperbarui chat. Silakan coba lagi.');
      }
    });
  }

  markAsRead(chat: Chat) {
    // Implementasi API untuk menandai pesan sebagai telah dibaca
    this.chatService.markAsRead(chat.id).subscribe({
      next: () => {
    chat.unread = 0;
        // Update total unread count
        const totalUnread = this.getTotalUnread();
        this.chatService.setUnreadCount(totalUnread);
      },
      error: (error) => {
        console.error('Error marking chat as read:', error);
      }
    });
  }

  muteChat(chat: Chat) {
    // Toggle mute status (hanya UI untuk saat ini)
    chat.muted = !chat.muted;
    this.presentToast(chat.muted ? 'Chat dibisukan' : 'Chat tidak lagi dibisukan');
  }

  async deleteChat(chat: Chat) {
    try {
      // Panggil API untuk menghapus chat
      await this.chatService.deleteChat(chat.id).toPromise();
      
      // Hapus dari array
            this.chats = this.chats.filter(c => c.id !== chat.id);
            this.applyFilters();
      
      // Update total unread count
      const totalUnread = this.getTotalUnread();
      this.chatService.setUnreadCount(totalUnread);
      
      this.presentToast('Chat telah dihapus');
    } catch (error) {
      console.error('Error deleting chat:', error);
      this.presentToast('Gagal menghapus chat. Silakan coba lagi.');
    }
  }
}
