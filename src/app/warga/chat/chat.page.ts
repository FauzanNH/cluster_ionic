import { Component, OnInit, ViewChildren, QueryList, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { ToastController, AlertController, GestureController, IonItem, Gesture, ModalController } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { ChatService, Chat } from '../../services/chat.service';
import { Subscription, interval } from 'rxjs';
import { ContactSearchModalComponent } from './contact-search-modal/contact-search-modal.component';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false,
})
export class ChatPage implements OnInit, AfterViewInit, OnDestroy {
  
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
  private chatPollingSubscription?: Subscription;
  isLoading: boolean = true;
  loadingError: string = '';

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
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.loadChats();
    this.startChatPolling();
  }

  ngAfterViewInit() {
    this.setupLongPress();
  }

  ngOnDestroy() {
    // Bersihkan subscription saat komponen dihancurkan
    if (this.chatPollingSubscription) {
      this.chatPollingSubscription.unsubscribe();
    }
    
    // Hapus semua gesture
    this.gestures.forEach(gesture => gesture.destroy());
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
      chat.lastMessage.toLowerCase().includes(query)
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

  // Memuat daftar chat dari API
  loadChats() {
    this.isLoading = true;
    this.loadingError = '';
    
    this.chatService.getChatList().subscribe(
      (chats) => {
        this.chats = chats;
        this.filteredChats = [...this.chats];
        this.isLoading = false;
        this.refreshGestures();
        // Update unread count ke service
        this.chatService.setUnreadCount(this.getTotalUnread());
      },
      (error) => {
        console.error('Error loading chats:', error);
        this.isLoading = false;
        this.loadingError = error.message || 'Gagal memuat daftar chat';
        this.presentToast(this.loadingError);
      }
    );
  }

  // Mulai polling untuk pembaruan chat
  startChatPolling() {
    // Polling setiap 3 detik, lebih cepat dari sebelumnya
    this.chatPollingSubscription = interval(3000).subscribe(() => {
      // Hanya lakukan polling jika halaman aktif dan tidak dalam mode seleksi
      if (!this.isSelectionMode) {
        this.updateChatList();
      }
    });
  }

  // Update daftar chat tanpa indikator loading
  updateChatList() {
    // Tambahkan timestamp untuk mencegah caching
    const timestamp = new Date().getTime();
    this.chatService.getChatList(timestamp).subscribe(
      (chats) => {
        // Filter chat untuk menghilangkan item yang tidak valid
        const validChats = chats.filter(chat => {
          return chat && chat.id && chat.name; // Pastikan chat memiliki id dan name
        });
        
        // Periksa apakah ada perubahan dalam daftar chat
        if (this.hasChatsChanged(this.chats, validChats)) {
          console.log('Daftar chat diperbarui:', new Date());
          this.chats = validChats;
          this.applyFilters(); // Terapkan filter yang aktif
        }
        // Update unread count ke service (selalu update meski tidak ada perubahan)
        this.chatService.setUnreadCount(this.getTotalUnread());
      },
      (error) => {
        console.error('Error updating chats:', error);
        // Tidak perlu menampilkan pesan error pada polling
      }
    );
  }

  // Memeriksa apakah daftar chat berubah
  private hasChatsChanged(oldChats: Chat[], newChats: Chat[]): boolean {
    if (!oldChats || !newChats) {
      return true; // Jika salah satu array tidak valid, anggap berubah
    }
    
    if (oldChats.length !== newChats.length) {
      return true;
    }
    
    // Bandingkan pesan terakhir dan status unread
    for (let i = 0; i < newChats.length; i++) {
      if (!newChats[i] || !newChats[i].id) {
        continue; // Lewati chat yang tidak valid
      }
      
      const oldChat = oldChats.find(c => c && c.id === newChats[i].id);
      if (!oldChat) {
        return true;
      }
      
      if (oldChat.lastMessage !== newChats[i].lastMessage || 
          oldChat.unread !== newChats[i].unread ||
          oldChat.is_online !== newChats[i].is_online) {
        return true;
      }
    }
    
    return false;
  }

  async openChat(chat: Chat) {
    // Jangan lakukan apa-apa saat transisi berlangsung
    if (this.transitioning) return;
    
    // Periksa debounce untuk mencegah double-click
    const now = new Date().getTime();
    if (now - this.lastTapTime < 300) {
      return;
    }
    this.lastTapTime = now;

    // Jika dalam mode seleksi, tandai item sebagai dipilih
    if (this.isSelectionMode) {
      this.toggleSelection(chat);
      return;
    }

    // Jika tidak dalam mode seleksi, buka chat
    // Navigasi ke halaman chat detail
    this.navCtrl.navigateForward(`/warga/chat/viewchat/${chat.id}`);
  }

  toggleSelection(chat: Chat) {
    if (this.transitioning) return;
    
    // Toggle status seleksi
    chat.selected = !chat.selected;
    
    if (chat.selected) {
      // Tambahkan ke array terpilih jika belum ada
      if (!this.selectedChats.some(c => c.id === chat.id)) {
        this.selectedChats.push(chat);
      }
    } else {
      // Hapus dari array terpilih
      this.selectedChats = this.selectedChats.filter(c => c.id !== chat.id);
    }
    
    // Force change detection / refresh UI
    this.filteredChats = [...this.filteredChats];
    
    // Jika tidak ada item terpilih, matikan mode seleksi
    if (this.selectedChats.length === 0) {
      this.exitSelectionMode();
    }
  }

  async exitSelectionMode() {
    if (this.transitioning) return;
    
    this.transitioning = true;
    
    // Aktifkan mode transisi
    this.isSelectionTransitioning = true;
    
    // Reset status seleksi
    this.selectedChats = [];
    this.chats.forEach(chat => chat.selected = false);
    
    // Keluar dari mode seleksi setelah animasi selesai
    setTimeout(() => {
      this.isSelectionMode = false;
      
      // Tunggu sampai DOM diupdate
      setTimeout(() => {
        this.isSelectionTransitioning = false;
        setTimeout(() => {
          this.transitioning = false;
        }, 100);
      }, 50);
    }, 300); // Sesuaikan dengan durasi animasi di CSS (0.3s)
    
    this.applyFilters();
  }

  markSelectedAsRead() {
    const promises: Promise<any>[] = [];
    
    this.selectedChats.forEach(chat => {
      promises.push(
        this.chatService.markAsRead(chat.id).toPromise()
          .then(() => {
      chat.unread = 0;
          })
          .catch(error => {
            console.error(`Error marking chat ${chat.id} as read:`, error);
            throw error;
          })
      );
    });
    
    Promise.all(promises)
      .then(() => {
    this.presentToast(`${this.selectedChats.length} pesan ditandai sudah dibaca`);
    this.exitSelectionMode();
      })
      .catch(error => {
        this.presentToast('Gagal menandai beberapa pesan sebagai dibaca');
        console.error('Error in markSelectedAsRead:', error);
      });
  }

  muteSelectedChats() {
    // Fungsi ini harus diimplementasikan di backend juga
    const muteStatus = !this.selectedChats[0].muted;
    this.selectedChats.forEach(chat => {
      chat.muted = muteStatus;
    });
    
    const status = muteStatus ? 'dinonaktifkan' : 'diaktifkan';
    this.presentToast(`Notifikasi untuk ${this.selectedChats.length} chat ${status}`);
    this.exitSelectionMode();
  }

  async deleteSelectedChats() {
    const count = this.selectedChats.length;
    
    const alert = await this.alertController.create({
      header: 'Hapus Chat',
      message: `Apakah Anda yakin ingin menghapus ${count} chat yang dipilih?`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: () => {
            const promises: Promise<any>[] = [];
            const selectedIds = this.selectedChats.map(c => c.id);
            
            selectedIds.forEach(id => {
              promises.push(
                this.chatService.deleteChat(id).toPromise()
                  .catch(error => {
                    console.error(`Error deleting chat ${id}:`, error);
                    throw error;
                  })
              );
            });
            
            Promise.all(promises)
              .then(() => {
            this.chats = this.chats.filter(c => !selectedIds.includes(c.id));
            this.presentToast(`${count} chat telah dihapus`);
            this.applyFilters();
            this.exitSelectionMode();
              })
              .catch(error => {
                this.presentToast('Gagal menghapus beberapa chat');
                console.error('Error in deleteSelectedChats:', error);
              });
          }
        }
      ]
    });

    await alert.present();
  }

  async startNewChat() {
    const modal = await this.modalController.create({
      component: ContactSearchModalComponent,
      cssClass: 'contact-search-modal',
      componentProps: {
        navController: this.navCtrl
      }
    });

    // Tambahkan event listener untuk hasil dari modal
    modal.onDidDismiss().then((result) => {
      console.log('Modal dismissed with result:', result);
      if (result && result.data && result.data.chatId) {
        console.log('Navigating to chat with ID:', result.data.chatId);
        this.navCtrl.navigateForward(`/warga/chat/viewchat/${result.data.chatId}`);
          }
    });

    await modal.present();
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
    this.chatService.getChatList().subscribe(
      (chats) => {
        this.chats = chats;
        this.applyFilters();
      event.target.complete();
      this.presentToast('Pesan telah diperbarui');
      this.refreshGestures();
      },
      (error) => {
        event.target.complete();
        this.presentToast('Gagal memperbarui pesan: ' + error.message);
      }
    );
  }

  markAsRead(chat: Chat) {
    this.chatService.markAsRead(chat.id).subscribe(
      () => {
    chat.unread = 0;
    this.presentToast(`Pesan dari ${chat.name} ditandai sudah dibaca`);
      },
      (error) => {
        this.presentToast('Gagal menandai pesan sebagai dibaca: ' + error.message);
      }
    );
  }

  muteChat(chat: Chat) {
    // Fungsi ini harus diimplementasikan di backend juga
    chat.muted = !chat.muted;
    const status = chat.muted ? 'dinonaktifkan' : 'diaktifkan';
    this.presentToast(`Notifikasi untuk ${chat.name} ${status}`);
  }

  async deleteChat(chat: Chat) {
    const alert = await this.alertController.create({
      header: 'Hapus Chat',
      message: `Apakah Anda yakin ingin menghapus chat dengan ${chat.name}?`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: () => {
            this.chatService.deleteChat(chat.id).subscribe(
              () => {
            this.chats = this.chats.filter(c => c.id !== chat.id);
                this.applyFilters();
            this.presentToast(`Chat dengan ${chat.name} telah dihapus`);
              },
              (error) => {
                this.presentToast('Gagal menghapus chat: ' + error.message);
              }
            );
          }
        }
      ]
    });

    await alert.present();
  }
}
