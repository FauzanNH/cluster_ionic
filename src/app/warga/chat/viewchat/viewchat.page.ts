import { Component, OnInit, ViewChild, ElementRef, QueryList, ViewChildren, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, NavController, ActionSheetController, AlertController, ToastController, ActionSheetButton, GestureController, Gesture, ModalController } from '@ionic/angular';
import { ImagePreviewComponent } from '../image-preview/image-preview.component';
import { DocumentPreviewComponent } from '../document-preview/document-preview.component';
import { ChatService, Message } from '../../../services/chat.service';
import { Subscription, interval, catchError, of, debounceTime, filter } from 'rxjs';
import { Keyboard } from '@capacitor/keyboard';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';

// Declare Capacitor untuk TypeScript
declare global {
  interface Window {
    Capacitor?: {
      Plugins?: {
        Browser?: {
          open: (options: { url: string }) => Promise<void>;
        },
        FileOpener?: {
          open: (options: { filePath: string, contentType: string }) => Promise<void>;
        },
        Camera?: {
          getPhoto?: (options: { quality: number }) => Promise<{ base64String: string }>;
        },
        Permissions?: {
          query?: (options: { name: string }) => Promise<{ state: string }>;
          request?: (options: { name: string }) => Promise<{ state: string }>;
        }
      }
    }
  }
}

@Component({
  selector: 'app-viewchat',
  templateUrl: './viewchat.page.html',
  styleUrls: ['./viewchat.page.scss'],
  standalone: false,
})
export class ViewchatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  @ViewChildren('messageBubble', { read: ElementRef }) messageBubbles!: QueryList<ElementRef>;
  
  // Daftar kata terlarang - akan diisi dari file CSV
  private forbiddenWords: string[] = [];
  
  chatId: string = '';
  otherUser: any = null;
  messages: Message[] = [];
  newMessage: string = '';
  currentDate: Date = new Date();
  isTyping: boolean = false;
  isLoading: boolean = true;
  loadingError: string = '';
  lastMessageId: string = '';
  
  // Variabel untuk mode seleksi
  isSelectionMode: boolean = false;
  selectedMessages: Message[] = [];
  
  // Variabel untuk gesture
  private gestures: Gesture[] = [];
  private isLongPressActive: boolean = false;
  
  // Variabel untuk status kontak
  isBlocked: boolean = false;
  
  // Variabel untuk image viewer
  isImageViewerOpen: boolean = false;
  viewerImage: string = '';
  
  // Variabel untuk reply
  replyingTo: Message | null = null;
  
  // Counter untuk error berulang
  private errorCounter: number = 0;
  
  // Polling interval
  private messagePollingSubscription?: Subscription;
  private messagePollingInterval: number = 3000; // 3 detik, lebih responsif

  // Variabel untuk status unduhan dokumen
  private downloadingDocuments: Set<string> = new Set();
  private downloadedDocuments: Set<string> = new Set();

  keyboardVisible = false;
  keyboardHeight = 0;

  // Tambahkan variabel untuk menyimpan subscription
  private routeSubscription: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private gestureCtrl: GestureController,
    private modalCtrl: ModalController,
    private chatService: ChatService,
    private http: HttpClient,
    private platform: Platform
  ) { }

  ngOnInit() {
    // Load kata-kata terlarang dari CSV
    this.loadForbiddenWords();
    
    // Dapatkan ID chat dari parameter URL
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
    this.chatId = id;
    this.loadChatData();
      } else {
        this.navCtrl.navigateBack('/warga/chat');
      }
    });
    
    // Sembunyikan tab bar
    this.hideTabBar();

    // Keyboard event listener
    Keyboard.addListener('keyboardDidShow', (info: any) => {
      this.keyboardVisible = true;
      this.keyboardHeight = info.keyboardHeight || 300;
    });
    Keyboard.addListener('keyboardDidHide', () => {
      this.keyboardVisible = false;
      this.keyboardHeight = 0;
    });
  }
  
  ionViewWillEnter() {
    // Sembunyikan tab bar saat halaman ini aktif
    this.hideTabBar();
    
    // Mulai polling pesan baru
    this.startMessagePolling();
    
    // Tandai pesan sebagai dibaca
    this.markMessagesAsRead();
  }
  
  ionViewWillLeave() {
    // Tampilkan kembali tab bar saat meninggalkan halaman
    this.showTabBar();
    
    // Hentikan polling pesan baru
    this.stopMessagePolling();
  }
  
  ionViewDidEnter() {
    this.scrollToBottom();
    
    // Setup gesture untuk long press
    setTimeout(() => {
      this.setupLongPress();
    }, 500);
  }
  
  ngAfterViewInit() {
    // Mengamati perubahan pada DOM untuk memperbarui gesture
    this.messageBubbles.changes.subscribe(() => {
      this.setupLongPress();
      this.setupSwipeReply();
    });
    
    // Inisialisasi pertama kali
    this.setupSwipeReply();
    
    // Setup listener untuk perubahan visibilitas halaman
    this.setupVisibilityListener();
  }

  /**
   * Menambahkan listener untuk memantau visibilitas halaman
   * Ini memastikan polling dijalankan atau dihentikan berdasarkan visibilitas
   */
  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Handler untuk perubahan visibilitas halaman
   */
  private handleVisibilityChange = () => {
    if (document.hidden) {
      // Jika halaman tidak visible (tab di background), hentikan polling
      console.log('Page hidden, pausing polling');
      // Tidak hentikan polling sepenuhnya, karena akan dijalankan dengan filter
    } else {
      // Jika halaman menjadi visible kembali, cek pesan baru sekali
      console.log('Page visible again, checking for new messages');
      if (this.chatId && this.lastMessageId) {
        // Segera cek pesan baru saat kembali ke halaman
        this.checkForNewMessages();
      }
    }
  };

  ngOnDestroy() {
    // Hentikan polling pesan
    this.stopMessagePolling();
    
    // Lepaskan semua subscription
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    
    // Hapus semua gesture
    this.gestures.forEach(gesture => gesture.destroy());
    
    // Hapus visibility listener
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Tampilkan tab bar kembali
    this.showTabBar();
    
    // Remove keyboard listeners
    Keyboard.removeAllListeners();
  }

  hideTabBar() {
    const tabBar = document.querySelector('ion-tab-bar');
    if (tabBar) {
      tabBar.style.display = 'none';
    }
  }
  
  showTabBar() {
    const tabBar = document.querySelector('ion-tab-bar');
    if (tabBar) {
      tabBar.style.display = 'flex';
    }
  }

  // Memuat data chat dari API
  loadChatData() {
    this.isLoading = true;
    this.loadingError = '';
    
    // Ambil chat_id dari URL parameter
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) {
        this.isLoading = false;
        this.loadingError = 'ID chat tidak valid';
        return;
      }
      
      this.chatId = id;
      
      // Reset pesan
      this.messages = [];
      this.cancelReply();
      
      // Muat data forbidden words
      this.loadForbiddenWords();
      
      // Ambil detail chat dari API
      this.chatService.getChatDetail(this.chatId).subscribe({
        next: (response: {
          success: boolean;
          chat: {
            id: string;
            otherUser: any;
            messages: any[];
          };
        }) => {
          if (response.success) {
            // Set data user lain
            this.otherUser = response.chat.otherUser;
            
            // Transform messages untuk menambahkan storageUrl ke path gambar
            const messages = response.chat.messages.map((msg: any) => {
              // Jika ada image, pastikan menggunakan URL lengkap
              if (msg.image && !msg.image.startsWith('http')) {
                msg.image = `${environment.storageUrl}/${msg.image.replace('/storage/', '')}`;
              }
              
              // Jika ada replyTo dengan image, pastikan juga URL-nya lengkap
              if (msg.replyTo && msg.replyTo.image && !msg.replyTo.image.startsWith('http')) {
                msg.replyTo.image = `${environment.storageUrl}/${msg.replyTo.image.replace('/storage/', '')}`;
              }
              
              // Proses dokumen jika ada
              if (msg.document && msg.document.url && !msg.document.url.startsWith('http')) {
                msg.document.url = `${environment.storageUrl}/${msg.document.url.replace('/storage/', '')}`;
              }
              
              return msg;
            });
            
            this.messages = messages;
            
            // Set last_message_id untuk polling
            if (this.messages.length > 0) {
              this.lastMessageId = this.messages[this.messages.length - 1].id;
            }
            
            this.markMessagesAsRead();
            
            // Set timeout untuk scroll ke bawah setelah pesan dimuat
            setTimeout(() => {
              this.scrollToBottom(100);
            }, 300);
            
            this.isLoading = false;
            
            // Mulai polling untuk pesan baru
            this.startMessagePolling();
          } else {
            this.isLoading = false;
            this.loadingError = 'Gagal memuat data chat';
          }
        },
        error: (error: Error) => {
          console.error('Error loading chat data:', error);
          this.isLoading = false;
          this.loadingError = 'Gagal memuat data. Periksa koneksi internet Anda.';
        }
      });
    });
  }

  // Mulai polling untuk pesan baru
  startMessagePolling() {
    // Hentikan polling sebelumnya jika ada
    this.stopMessagePolling();
    
    // Reset error counter ketika memulai polling baru
    this.errorCounter = 0;
    
    // Interval polling yang tidak terlalu cepat untuk mengurangi beban server
    this.messagePollingInterval = 3000; // 3 detik, lebih responsif
    
    console.log('Starting message polling with interval:', this.messagePollingInterval, 'ms');
    
    // Polling setiap beberapa detik
    this.messagePollingSubscription = interval(this.messagePollingInterval)
      .pipe(
        // Tambahkan debounce untuk mencegah terlalu banyak request
        debounceTime(300),
        // Hanya lanjutkan jika halaman aktif
        filter(() => !document.hidden)
      )
      .subscribe(() => {
        // Pastikan data chat dan lastMessageId valid
        if (this.chatId && this.lastMessageId) {
          this.checkForNewMessages();
        } else {
          console.log('Skipping polling - chat data not ready yet');
        }
      });
  }
  
  // Hentikan polling pesan baru
  stopMessagePolling() {
    if (this.messagePollingSubscription) {
      this.messagePollingSubscription.unsubscribe();
      this.messagePollingSubscription = undefined;
    }
  }
  
  // Periksa pesan baru dengan optimasi
  checkForNewMessages() {
    if (!this.chatId || this.lastMessageId === '') {
      console.log('Tidak dapat memeriksa pesan baru: chatId atau lastMessageId tidak valid');
      return;
    }
    
    console.log('Checking for new messages. Last message ID:', this.lastMessageId);
    
    // Tambahkan timestamp untuk mencegah caching
    const timestamp = new Date().getTime();
    this.chatService.getNewMessages(this.chatId, this.lastMessageId, timestamp).subscribe({
      next: (response) => {
        if (response && response.success && response.messages && response.messages.length > 0) {
          console.log(`${response.messages.length} pesan baru diterima:`, new Date());
          
          // Format pesan untuk menambahkan storageUrl ke path gambar
          const newMessages = response.messages.map((msg: any) => {
            // Jika ada image, pastikan menggunakan URL lengkap
            if (msg.image && !msg.image.startsWith('http')) {
              msg.image = `${environment.storageUrl}/${msg.image}`;
            }
            
            // Jika ada replyTo dengan image, pastikan juga URL-nya lengkap
            if (msg.replyTo && msg.replyTo.image && !msg.replyTo.image.startsWith('http')) {
              msg.replyTo.image = `${environment.storageUrl}/${msg.replyTo.image}`;
            }
            
            // Proses dokumen jika ada
            if (msg.document && msg.document.url && !msg.document.url.startsWith('http')) {
              msg.document.url = `${environment.storageUrl}/${msg.document.url}`;
            }
            
            return msg;
          });
          
          // Tambahkan pesan baru ke array pesan
          this.messages = [...this.messages, ...newMessages];
          
          // Update lastMessageId dengan ID pesan terbaru
          const lastMsg = newMessages[newMessages.length - 1];
          this.lastMessageId = lastMsg.id.toString();
          
          // Tandai pesan baru sebagai dibaca
          this.markMessagesAsRead();
          
          // Scroll ke bawah jika tidak dalam mode seleksi
          if (!this.isSelectionMode) {
            this.scrollToBottom(100);
          }
          
          // Mainkan suara notifikasi
          this.playNotificationSound();
          
          // Reset error counter karena berhasil mendapatkan pesan
          this.errorCounter = 0;
        } else {
          console.log('Tidak ada pesan baru');
        }
      },
      error: (error) => {
        console.error('Error checking for new messages:', error);
        
        // Jika error 404, berarti chat mungkin sudah dihapus
        if (error && error.status === 404) {
          // Jika error terjadi berulang kali, tampilkan alert
          this.errorCounter = (this.errorCounter || 0) + 1;
          
          if (this.errorCounter >= 3) {
            // Hentikan polling terlebih dahulu
            this.stopMessagePolling();
            
            // Tampilkan pesan alert bahwa chat sudah tidak tersedia
            this.alertCtrl.create({
              header: 'Terjadi Kesalahan',
              message: 'Terjadi kesalahan saat memuat pesan. Coba lagi nanti.',
              buttons: [{
                text: 'Kembali',
                handler: () => {
                  // Navigasi kembali ke halaman daftar chat
                  this.navCtrl.navigateBack('/warga/chat');
                }
              }]
            }).then(alert => {
              alert.present();
            });
          } else {
            console.log('Error saat polling, mencoba lagi nanti. Counter:', this.errorCounter);
          }
        } else {
          // Untuk error selain 404, kita bisa mencoba lagi nanti
          console.log('Polling akan mencoba kembali pada interval berikutnya');
        }
      }
    });
  }
  
  // Fungsi untuk memainkan suara notifikasi
  playNotificationSound() {
    try {
      const notificationSound = document.getElementById('notificationSound') as HTMLAudioElement;
      if (notificationSound) {
        notificationSound.volume = 0.5; // Volume 50%
        notificationSound.play();
      }
    } catch (e) {
      console.log('Suara notifikasi tidak tersedia');
    }
  }
  
  // Tandai semua pesan sebagai dibaca
  markMessagesAsRead() {
    if (!this.chatId) return;
    
    this.chatService.markAsRead(this.chatId).subscribe(
      () => {
        // Update status dibaca secara lokal
        this.messages.forEach(message => {
          if (message.sender === 'other') {
            message.read = true;
          }
        });
      },
      (error) => {
        console.error('Error marking messages as read:', error);
        
        // Jika error 404, kita tidak perlu melakukan apa-apa khusus
        // karena penanganan sudah dilakukan di checkForNewMessages dan loadChatData
        if (error && error.status !== 404) {
          // Untuk error selain 404, kita bisa mencoba lagi nanti
          console.log('Akan mencoba menandai pesan terbaca pada kesempatan berikutnya');
        }
      }
    );
  }

  // Setup long press gesture untuk setiap bubble pesan
  setupLongPress() {
    // Hapus gesture sebelumnya jika ada
    if (this.gestures.length > 0) {
      this.gestures.forEach(gesture => gesture.destroy());
      this.gestures = [];
    }
    
    // Dapatkan semua elemen pesan
    const messageElements = document.querySelectorAll('.message-bubble');
    
    messageElements.forEach((el, index) => {
      const messageIndex = index;
      
      // Gesture long press untuk seleksi
      const gesture = this.gestureCtrl.create({
        el: el as HTMLElement,
        threshold: 0,
        gestureName: 'long-press',
        onStart: (ev) => {
          const startTime = new Date().getTime();
          this.isLongPressActive = false;
          const checkDuration = () => {
            const now = new Date().getTime();
            const elapsedTime = now - startTime;
            if (elapsedTime >= 500 && !this.isLongPressActive) {
              this.isLongPressActive = true;
              if (messageIndex < this.messages.length) {
                const message = this.messages[messageIndex];
                this.handleLongPress(message);
              }
              clearInterval(timer);
              document.removeEventListener('touchend', cancelLongPress);
            }
          };
          const timer = setInterval(checkDuration, 100);
          const cancelLongPress = () => {
            clearInterval(timer);
            document.removeEventListener('touchend', cancelLongPress);
          };
          document.addEventListener('touchend', cancelLongPress, { once: true });
        },
        gesturePriority: 100
      }, true);
      gesture.enable(true);
      this.gestures.push(gesture);

      // Gesture swipe right untuk reply
      const swipeGesture = this.gestureCtrl.create({
        el: el as HTMLElement,
        gestureName: 'swipe-reply',
        direction: 'x',
        threshold: 10,
        onMove: (ev) => {
          if (ev.deltaX > 0 && Math.abs(ev.deltaY) < 30) {
            (el as HTMLElement).classList.add('swiping-right');
          }
          if (ev.deltaX > 30 && Math.abs(ev.deltaY) < 30) {
            if (messageIndex < this.messages.length) {
              const message = this.messages[messageIndex];
              this.replyingTo = message;
              this.cancelSelection();
              setTimeout(() => {
                const inputElement = document.querySelector('ion-textarea');
                if (inputElement) {
                  (inputElement as any).setFocus();
                }
              }, 300);
            }
            (el as HTMLElement).classList.remove('swiping-right');
          }
        },
        onEnd: (ev) => {
          (el as HTMLElement).classList.remove('swiping-right');
        }
      }, true);
      swipeGesture.enable(true);
      this.gestures.push(swipeGesture);
    });
    // Tambahkan setupSwipeReply setelah semua gesture di-setup
    this.setupSwipeReply();
  }
  
  // Handler untuk long press
  handleLongPress(message: Message) {
    // Aktifkan mode seleksi jika belum aktif
    if (!this.isSelectionMode) {
      this.isSelectionMode = true;
      this.selectedMessages = [message];
      message.selected = true;
      
      // Berikan umpan balik haptic/visual
      this.presentToast('Pesan dipilih');
    } else {
      // Jika sudah dalam mode seleksi, tambahkan ke seleksi
      if (!this.isMessageSelected(message)) {
        this.selectedMessages.push(message);
        message.selected = true;
      }
    }
  }
  
  // Metode untuk balas pesan yang dipilih
  replyToSelectedMessage() {
    if (this.selectedMessages.length !== 1) {
      this.presentToast('Pilih satu pesan untuk dibalas');
      return;
    }
    
    this.replyingTo = this.selectedMessages[0];
    this.cancelSelection();
    
    setTimeout(() => {
      const inputElement = document.querySelector('ion-textarea');
      if (inputElement) {
        inputElement.setFocus();
      }
    }, 300);
  }
  
  // Metode untuk membatalkan balasan
  cancelReply() {
    this.replyingTo = null;
  }
  
  // Metode untuk menyalin pesan yang dipilih
  copySelectedMessage() {
    if (this.selectedMessages.length !== 1) {
      this.presentToast('Pilih satu pesan untuk disalin');
      return;
    }
    
    const message = this.selectedMessages[0];
    
    if (message.text) {
      navigator.clipboard.writeText(message.text)
        .then(() => {
          this.presentToast('Pesan disalin ke clipboard');
          this.cancelSelection();
        })
        .catch(err => {
          console.error('Gagal menyalin teks: ', err);
        });
    }
  }
  
  // Metode untuk menampilkan opsi lanjutan
  async showMoreOptions() {
    if (this.selectedMessages.length !== 1) {
      this.presentToast('Pilih satu pesan untuk melihat opsi lanjutan');
      return;
    }
    
    const message = this.selectedMessages[0];
    const isOwnMessage = message.sender === 'me';
    
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Opsi Lanjutan',
      buttons: [
        {
          text: 'Salin',
          icon: 'copy-outline',
          handler: () => {
            this.copySelectedMessage();
          }
        },
        {
          text: isOwnMessage ? 'Edit' : 'Laporkan',
          icon: isOwnMessage ? 'create-outline' : 'flag-outline',
          handler: () => {
            if (isOwnMessage) {
              this.editSelectedMessage();
            } else {
              this.reportSelectedMessage();
            }
          }
        },
        {
          text: 'Batal',
          role: 'cancel',
          icon: 'close-outline'
        }
      ]
    });
    
    await actionSheet.present();
  }
  
  // Metode untuk mengedit pesan yang dipilih
  async editSelectedMessage() {
    if (this.selectedMessages.length !== 1) {
      this.presentToast('Pilih satu pesan untuk diedit');
      return;
    }
    
    const message = this.selectedMessages[0];
    
    // Hanya pesan yang dikirim oleh pengguna yang dapat diedit
    if (message.sender !== 'me') {
      this.presentToast('Anda hanya dapat mengedit pesan yang Anda kirim');
      return;
    }
    
    const alert = await this.alertCtrl.create({
      header: 'Edit Pesan',
      inputs: [
        {
          name: 'messageText',
          type: 'textarea',
          value: message.text,
          placeholder: 'Ketik pesan baru'
        }
      ],
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Simpan',
          handler: (data) => {
            if (data.messageText && data.messageText.trim() !== '') {
              // Update pesan
              message.text = data.messageText;
              this.presentToast('Pesan telah diperbarui');
              this.cancelSelection();
            }
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  // Metode untuk melaporkan pesan yang dipilih
  async reportSelectedMessage() {
    if (this.selectedMessages.length !== 1) {
      this.presentToast('Pilih satu pesan untuk dilaporkan');
      return;
    }
    
    const message = this.selectedMessages[0];
    
    const alert = await this.alertCtrl.create({
      header: 'Laporkan Pesan',
      message: 'Apakah Anda yakin ingin melaporkan pesan ini?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Laporkan',
          handler: () => {
            this.presentToast('Pesan telah dilaporkan');
            this.cancelSelection();
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  // Metode untuk menghapus pesan yang dipilih
  async deleteSelectedMessages() {
    if (this.selectedMessages.length === 0) return;
    
    const alert = await this.alertCtrl.create({
      header: 'Hapus Pesan',
      message: this.selectedMessages.length === 1 
        ? 'Apakah Anda yakin ingin menghapus pesan ini?' 
        : `Apakah Anda yakin ingin menghapus ${this.selectedMessages.length} pesan?`,
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
              const selectedIds = this.selectedMessages.map(m => m.id);
            
            selectedIds.forEach(id => {
              promises.push(
                this.chatService.deleteMessage(id).toPromise()
                  .catch(error => {
                    console.error(`Error deleting message ${id}:`, error);
                    throw error;
                  })
              );
            });
            
            Promise.all(promises)
              .then(() => {
                // Hapus pesan yang dihapus dari array lokal
                this.messages = this.messages.filter(m => !selectedIds.includes(m.id));
              
              this.presentToast(
                this.selectedMessages.length === 1 
                  ? 'Pesan telah dihapus' 
                  : `${this.selectedMessages.length} pesan telah dihapus`
              );
              
              this.cancelSelection();
              })
              .catch(error => {
                this.presentToast('Gagal menghapus beberapa pesan');
                console.error('Error in deleteSelectedMessages:', error);
              });
          }
        }
      ]
    });
    
    await alert.present();
  }

  // Menangani pemilihan pesan
  toggleMessageSelection(message: Message) {
    if (!this.isSelectionMode) {
      // Jika belum dalam mode seleksi, tidak melakukan apa-apa
      // Mode seleksi hanya diaktifkan dengan long press
      return;
    } else {
      // Jika sudah dalam mode seleksi, toggle status seleksi pesan
      const index = this.selectedMessages.findIndex(m => m.id === message.id);
      
      if (index >= 0) {
        // Hapus dari seleksi jika sudah dipilih
        this.selectedMessages.splice(index, 1);
        message.selected = false;
        
        // Jika tidak ada pesan yang dipilih, keluar dari mode seleksi
        if (this.selectedMessages.length === 0) {
          this.cancelSelection();
        }
      } else {
        // Tambahkan ke seleksi jika belum dipilih
        this.selectedMessages.push(message);
        message.selected = true;
      }
    }
  }
  
  // Memeriksa apakah pesan dipilih
  isMessageSelected(message: Message): boolean {
    return this.selectedMessages.some(m => m.id === message.id);
  }
  
  // Membatalkan mode seleksi
  cancelSelection() {
    this.isSelectionMode = false;
    
    // Reset status selected untuk semua pesan
    this.messages.forEach(message => {
        message.selected = false;
      });
    
    this.selectedMessages = [];
  }
  
  // Memeriksa apakah pesan dapat diedit (hanya pesan yang dikirim oleh pengguna)
  canEditMessage(message: Message): boolean {
    return message.sender === 'me';
  }
  
  // Menampilkan toast
  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    
    await toast.present();
  }

  // Fungsi untuk menangani opsi dropdown menu
  async blockContact() {
    // Toggle status blokir
    if (this.isBlocked) {
      // Jika sudah diblokir, buka blokir
      const alert = await this.alertCtrl.create({
        header: 'Buka Blokir Kontak',
        message: `Apakah Anda yakin ingin membuka blokir ${this.otherUser?.name}?`,
        buttons: [
          {
            text: 'Batal',
            role: 'cancel'
          },
          {
            text: 'Buka Blokir',
            handler: () => {
              this.isBlocked = false;
              this.presentToast(`${this.otherUser?.name} telah dibuka blokirnya`);
            }
          }
        ]
      });
      
      await alert.present();
    } else {
      // Jika belum diblokir, blokir
      const alert = await this.alertCtrl.create({
        header: 'Blokir Kontak',
        message: `Apakah Anda yakin ingin memblokir ${this.otherUser?.name}?`,
        buttons: [
          {
            text: 'Batal',
            role: 'cancel'
          },
          {
            text: 'Blokir',
            role: 'destructive',
            handler: () => {
              this.isBlocked = true;
              this.presentToast(`${this.otherUser?.name} telah diblokir`);
            }
          }
        ]
      });
      
      await alert.present();
    }
  }
  
  async clearChat() {
    const alert = await this.alertCtrl.create({
      header: 'Bersihkan Chat',
      message: 'Apakah Anda yakin ingin menghapus semua pesan dalam chat ini?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          role: 'destructive',
          handler: async () => {
            // Tampilkan loading
            const loading = await this.toastCtrl.create({
              message: 'Membersihkan pesan...',
              duration: 0, // Tidak otomatis hilang
              position: 'bottom'
            });
            
            await loading.present();
            
            // Hentikan polling sementara selama proses penghapusan
            this.stopMessagePolling();
            
            this.chatService.clearChat(this.chatId).subscribe(
              (response) => {
                loading.dismiss();
                // Kosongkan array pesan
                this.messages = [];
                // Mulai polling lagi
                this.startMessagePolling();
              this.presentToast('Chat telah dibersihkan');
              },
              (error) => {
                loading.dismiss();
                // Mulai polling lagi
                this.startMessagePolling();
                
                // Jika error 404, mungkin chat sudah dihapus
                if (error && error.status === 404) {
                  this.alertCtrl.create({
                    header: 'Chat Tidak Tersedia',
                    message: 'Percakapan ini mungkin telah dihapus atau tidak tersedia lagi.',
                    buttons: [{
                      text: 'Kembali',
                      handler: () => {
                        this.navCtrl.navigateBack('/warga/chat');
                      }
                    }]
                  }).then(alert => {
                    alert.present();
                  });
                } else {
                  // Untuk error lain
                  this.presentToast('Gagal membersihkan chat: ' + error.message);
                  
                  // Jika operasi gagal, coba refreshing data chat
                  this.loadChatData();
                }
              }
            );
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  async reportContact() {
    const alert = await this.alertCtrl.create({
      header: 'Laporkan Kontak',
      message: `Apakah Anda yakin ingin melaporkan ${this.otherUser?.name}?`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Laporkan',
          handler: () => {
            this.presentToast(`Laporan terhadap ${this.otherUser?.name} telah dikirim`);
            // Implementasi laporan kontak
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  // Fungsi untuk menangani opsi lampiran
  async attachImage() {
    try {
      // Minta izin akses galeri terlebih dahulu
      if (this.platform?.is('capacitor') || this.platform?.is('cordova')) {
        // Minta izin untuk camera
        try {
          // Request camera permissions
          const permissionStatus = await Camera.checkPermissions();
          
          if (permissionStatus.photos !== 'granted') {
            const requestResult = await Camera.requestPermissions();
            
            if (requestResult.photos !== 'granted') {
              this.presentToast('Izin akses galeri diperlukan untuk mengunggah gambar');
              return;
            }
          }
        } catch (err) {
          console.error('Error checking camera permissions:', err);
        }
      }

    // Buka modal ImagePreviewComponent
    const modal = await this.modalCtrl.create({
      component: ImagePreviewComponent,
      cssClass: 'fullscreen-modal'
    });
    
    await modal.present();
    
    // Tangani hasil dari modal
    const { data, role } = await modal.onWillDismiss();
    
    if (role === 'confirm' && data) {
      // Gunakan caption kosong jika pengguna tidak mengisi apa pun
      const caption = data.caption?.trim() || "";
      
      // Periksa apakah caption mengandung kata terlarang
      if (caption) {
        const forbiddenCheck = this.containsForbiddenWords(caption);
        if (forbiddenCheck.contains) {
          // Tampilkan pesan peringatan sebagai pesan lokal, bukan toast
          this.addLocalWarningMessage(forbiddenCheck.word);
          return;
        }
      }
      
      // Periksa apakah image adalah File object atau string base64
      let imageFile: File | undefined;
      
      if (data.image instanceof File) {
        // Jika sudah berupa File, gunakan langsung
        imageFile = data.image;
        console.log('Received File object from modal:', {
          name: imageFile?.name || 'unknown',
          size: imageFile?.size || 0,
          type: imageFile?.type || 'unknown'
        });
      } else if (typeof data.image === 'string' && data.image.startsWith('data:')) {
        // Jika masih berupa string base64, konversi ke File
        try {
          // Extract base64 data from the data URL
          const base64Data = data.image.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteArrays = [];
          
          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          
          // Determine file type from data URL
          const mimeType = data.image.split(';')[0].split(':')[1];
          const extension = mimeType.split('/')[1];
          
          // Create File object
          const blob = new Blob(byteArrays, { type: mimeType });
          imageFile = new File([blob], `image_${new Date().getTime()}.${extension}`, { type: mimeType });
          
          console.log('Converted base64 to File:', {
            name: imageFile.name,
            size: imageFile.size,
            type: imageFile.type
          });
        } catch (error) {
          console.error('Error converting base64 to File:', error);
          this.presentToast('Terjadi kesalahan saat memproses gambar');
          return;
        }
      } else {
        console.error('Invalid image format received:', typeof data.image);
        this.presentToast('Format gambar tidak valid');
        return;
      }
      
      // Kirim pesan dengan gambar
      this.sendMessage(caption, imageFile);
      }
    } catch (err) {
      console.error('Error accessing camera/gallery:', err);
      this.presentToast('Terjadi kesalahan saat mengakses galeri');
    }
  }
  
  async attachDocument() {
    try {
      // Minta izin akses penyimpanan terlebih dahulu
      if (this.platform?.is('capacitor') || this.platform?.is('cordova')) {
        try {
          // Periksa izin untuk mengakses file menggunakan plugin Filesystem
          await Filesystem.checkPermissions();
          
          // Di beberapa perangkat, operasi ini mungkin tidak memunculkan prompt,
          // tetapi setidaknya ini adalah pendekatan yang kompatibel dengan Capacitor v3+
        } catch (err) {
          console.error('Error checking filesystem permissions:', err);
          this.presentToast('Tidak dapat mengakses penyimpanan file');
          return;
        }
      }

    // Buka modal DocumentPreviewComponent
    const modal = await this.modalCtrl.create({
      component: DocumentPreviewComponent,
      cssClass: 'fullscreen-modal'
    });
    
    await modal.present();
    
    // Tangani hasil dari modal
    const { data, role } = await modal.onWillDismiss();
    
    if (role === 'confirm' && data) {
      if (data.document instanceof File) {
        // Gunakan caption kosong jika pengguna tidak mengisi apa pun
        const caption = data.caption?.trim() || `Dokumen: ${data.document.name}`;
        
        // Periksa apakah caption mengandung kata terlarang
        const forbiddenCheck = this.containsForbiddenWords(caption);
        if (forbiddenCheck.contains) {
          // Tampilkan pesan peringatan sebagai pesan lokal, bukan toast
          this.addLocalWarningMessage(forbiddenCheck.word);
          return;
        }
        
        this.sendMessage(caption, undefined, data.document);
      } else if (data.document) {
        // Untuk kasus lain, tampilkan pesan error
        console.error('Dokumen bukan instance File:', data.document);
        this.presentToast('Terjadi kesalahan saat memproses dokumen');
      }
      }
    } catch (err) {
      console.error('Error accessing file storage:', err);
      this.presentToast('Terjadi kesalahan saat mengakses penyimpanan file');
    }
  }
  
  // Mendapatkan ikon dokumen berdasarkan tipe
  getDocumentIcon(type: string | undefined): string {
    if (!type) return 'document-outline';
    
    switch (type.toLowerCase()) {
      case 'pdf':
        return 'document-text-outline';
      case 'doc':
      case 'docx':
        return 'document-outline';
      case 'xls':
      case 'xlsx':
        return 'grid-outline';
      case 'ppt':
      case 'pptx':
        return 'easel-outline';
      case 'txt':
        return 'create-outline';
      case 'zip':
        return 'archive-outline';
      default:
        return 'document-outline';
    }
  }
  
  // Membuka image viewer
  openImageViewer(imageUrl: string) {
    // Jika URL relatif, tambahkan storage URL
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${environment.storageUrl}/${imageUrl.replace('/storage/', '')}`;
    }
    this.viewerImage = imageUrl;
    this.isImageViewerOpen = true;
  }
  
  // Menutup image viewer
  closeImageViewer() {
    this.isImageViewerOpen = false;
    this.viewerImage = '';
  }

  // Metode untuk memeriksa apakah pesan mengandung kata terlarang
  private containsForbiddenWords(text: string): { contains: boolean, word?: string } {
    if (!text) return { contains: false };
    
    // Ubah teks menjadi lowercase untuk pencocokan yang tidak case-sensitive
    const lowerText = text.toLowerCase();
    
    // Periksa setiap kata terlarang
    for (const word of this.forbiddenWords) {
      // Periksa apakah kata terlarang ada dalam teks
      // Gunakan regex dengan word boundary untuk mencocokkan kata utuh
      const regex = new RegExp(`\\b${word}\\b|\\b${word}[^\\w]|[^\\w]${word}\\b`, 'i');
      if (regex.test(lowerText)) {
        return { contains: true, word: word };
      }
    }
    
    return { contains: false };
  }

  // Metode untuk menambahkan pesan peringatan lokal (tidak dikirim ke server)
  private addLocalWarningMessage(forbiddenWord: string | undefined) {
    const warningMessage: Message = {
      id: 'local_warning_' + new Date().getTime(),
      text: `Pesan tidak terkirim karena mengandung kata kasar, kekerasan, atau rasis.`,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      sender: 'system',
      read: true,
      created_at: new Date().toISOString(),
      isLocalWarning: true
    };
    
    // Tambahkan pesan peringatan ke array pesan
    this.messages.push(warningMessage);
    
    // Scroll ke bawah untuk melihat pesan peringatan
    this.scrollToBottom(100);
  }

  // Mengirim pesan dengan optimasi UI
  sendMessage(messageText?: string, imageFile?: File, documentFile?: File) {
    // Jika tidak ada teks pesan dan tidak ada file, gunakan teks dari input
    if (!messageText && !imageFile && !documentFile) {
      messageText = this.newMessage.trim();
      
      if (!messageText) return;
      
      this.newMessage = '';
    }
    
    // Periksa apakah pesan mengandung kata terlarang
    if (messageText) {
      const forbiddenCheck = this.containsForbiddenWords(messageText);
      if (forbiddenCheck.contains) {
        // Tampilkan pesan peringatan sebagai pesan lokal, bukan toast
        this.addLocalWarningMessage(forbiddenCheck.word);
        return;
      }
    }
    
    // Pastikan messageText tidak kosong, terutama saat mengirim dokumen
    // API memerlukan pesan teks saat mengirim media
    let tempImageUrl = '';
    if (!messageText || messageText.trim() === "") {
      if (imageFile) {
        // Untuk gambar, biarkan teks kosong jika pengguna tidak mengisi keterangan
        messageText = "";
        // Jika ada image file, buat preview URL untuk tampilan sementara
        tempImageUrl = URL.createObjectURL(imageFile);
      } else if (documentFile) {
        // Untuk dokumen, tetap gunakan nama file sebagai default
        messageText = `Dokumen: ${documentFile.name}`;
      } else {
        // Jika tidak ada file dan tidak ada pesan, batalkan pengiriman
        return;
      }
    }
    
    // Dapatkan ID pesan yang dibalas jika ada
    const replyToId = this.replyingTo ? this.replyingTo.id : undefined;
    
    // Buat objek pesan sementara untuk UI
    const tempMessage: Message = {
      id: 'temp_' + new Date().getTime(),
      text: messageText || '',
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      sender: 'me',
      read: false,
      created_at: new Date().toISOString(),
      sending: true // Flag untuk menandai pesan sedang dikirim
    };
    
    // Tambahkan preview gambar ke pesan sementara jika ada
    if (imageFile && tempImageUrl) {
      tempMessage.image = tempImageUrl;
    }
    
    // Tambahkan data reply jika ada
    if (this.replyingTo) {
      tempMessage.replyTo = {
        id: this.replyingTo.id,
        text: this.replyingTo.text,
        sender: this.replyingTo.sender
      };
      
      if (this.replyingTo.image) {
        tempMessage.replyTo.image = this.replyingTo.image;
      }
      
      // Reset replyingTo
      this.replyingTo = null;
    }
    
    // Tambahkan pesan sementara ke array messages
    this.messages.push(tempMessage);
    
    // Scroll ke bawah segera
    this.scrollToBottom(100);
      
    // Log untuk debugging
    console.log('Mengirim pesan:', {
      chatId: this.chatId,
      messageText: messageText,
      replyToId: replyToId,
      hasImage: !!imageFile,
      hasDocument: !!documentFile
    });
      
    // Kirim pesan melalui service
    this.chatService.sendMessage(this.chatId, messageText, replyToId, imageFile, documentFile).subscribe({
      next: (response) => {
        if (response && response.success) {
          // Temukan dan ganti pesan sementara dengan pesan yang sebenarnya
          const index = this.messages.findIndex(m => m.id === tempMessage.id);
          if (index !== -1) {
            // Ambil data pesan dari respons
            const newMessage = response.data;
            
            // Pastikan URL gambar menggunakan URL lengkap
            if (newMessage.image && !newMessage.image.startsWith('http')) {
              // Jika belum absolut, pastikan prefix /chat/images/ lalu gabung storageUrl
              if (!newMessage.image.startsWith('/chat/images/')) {
                newMessage.image = '/chat/images/' + newMessage.image.replace(/^\/+/, '');
              }
              newMessage.image = `${environment.storageUrl}${newMessage.image}`;
            }
            
            // Pastikan URL dokumen menggunakan URL lengkap
            if (newMessage.document && newMessage.document.url && !newMessage.document.url.startsWith('http')) {
              // Jika belum absolut, pastikan prefix /chat/documents/ lalu gabung storageUrl
              if (!newMessage.document.url.startsWith('/chat/documents/')) {
                newMessage.document.url = '/chat/documents/' + newMessage.document.url.replace(/^\/+/, '');
              }
              newMessage.document.url = `${environment.storageUrl}${newMessage.document.url}`;
            }
            
            // Hapus flag sending
            delete newMessage.sending;
            
            // Ganti pesan temp dengan pesan sebenarnya
            this.messages[index] = newMessage;
            
            // Revoke object URL untuk mencegah memory leak
            if (tempImageUrl) {
              URL.revokeObjectURL(tempImageUrl);
            }
            
            // Update lastMessageId
            this.lastMessageId = newMessage.id.toString();
          }
        } else {
          // Tandai pesan sebagai gagal terkirim
          const index = this.messages.findIndex(m => m.id === tempMessage.id);
          if (index !== -1) {
            this.messages[index].sendFailed = true;
            delete this.messages[index].sending;
          }
          
          // Revoke object URL untuk mencegah memory leak
          if (tempImageUrl) {
            URL.revokeObjectURL(tempImageUrl);
          }
          
          this.presentToast('Gagal mengirim pesan: ' + (response.message || 'Terjadi kesalahan'));
        }
      },
      error: (error) => {
        console.error('Error saat mengirim pesan:', error);
        
        // Tandai pesan sebagai gagal terkirim
        const index = this.messages.findIndex(m => m.id === tempMessage.id);
        if (index !== -1) {
          this.messages[index].sendFailed = true;
          delete this.messages[index].sending;
        }
        
        // Revoke object URL untuk mencegah memory leak
        if (tempImageUrl) {
          URL.revokeObjectURL(tempImageUrl);
        }
        
        let errorMessage = 'Gagal mengirim pesan';
        if (error.error && error.error.message) {
          errorMessage += ': ' + error.error.message;
        } else if (error.message) {
          errorMessage += ': ' + error.message;
        }
        
        this.presentToast(errorMessage);
      }
    });
  }

  scrollToBottom(duration: number = 300) {
    if (this.content) {
      try {
        // Gunakan requestAnimationFrame untuk memastikan UI sudah diupdate
        requestAnimationFrame(() => {
          this.content.scrollToBottom(duration);
        });
      } catch (err) {
        console.error('Error scrolling to bottom:', err);
      }
    }
  }

  getMessageClass(message: Message): string {
    if (message.sender === 'system' || message.isLocalWarning) {
      return 'system';
    }
    return message.sender === 'me' ? 'outgoing' : 'incoming';
  }

  formatTime(time: string): string {
    // Format time to match HH:MM format
    try {
      // If time is already in HH:MM format, return it
      if (/^\d{1,2}:\d{2}$/.test(time)) {
    return time;
      }
      
      // Try to parse the time string
      const date = new Date(time);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
      }
      
      // Fallback to original time if parsing fails
      return time;
    } catch (e) {
      return time;
    }
  }
  
  // Scroll ke pesan yang dirujuk
  scrollToMessage(messageId: string) {
    if (!messageId) return;
    
    // Cari indeks pesan yang dirujuk
    const messageIndex = this.messages.findIndex(m => m.id === messageId);
    
    if (messageIndex >= 0) {
      // Dapatkan elemen pesan
      setTimeout(() => {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        
        if (messageElement) {
          // Scroll ke elemen dengan animasi
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Tambahkan kelas highlight sementara
          messageElement.classList.add('highlight-message');
          
          // Hapus kelas highlight setelah animasi selesai
          setTimeout(() => {
            messageElement.classList.remove('highlight-message');
          }, 1500);
        }
      }, 300);
    }
  }
  
  // Pilih semua pesan
  selectAllMessages() {
    this.isSelectionMode = true;
    this.selectedMessages = [...this.messages];
    
    // Set status selected untuk semua pesan
    this.messages.forEach(message => {
      message.selected = true;
    });
  }
  
  // Memeriksa apakah semua pesan dipilih
  allMessagesSelected(): boolean {
    return this.selectedMessages.length === this.messages.length;
  }

  setupSwipeReply() {
    // Hapus event listener sebelumnya
    const messageElements = document.querySelectorAll('.message-bubble');
    messageElements.forEach((el: any) => {
      el.ontouchstart = null;
      el.ontouchmove = null;
      el.ontouchend = null;
      el.onmousedown = null;
      el.onmousemove = null;
      el.onmouseup = null;
    });
    // Tambahkan event listener baru
    messageElements.forEach((el: any, index: number) => {
      // Touch events (mobile)
      let startX = 0;
      let startY = 0;
      let moved = false;
      el.ontouchstart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          moved = false;
        }
      };
      el.ontouchmove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const dx = e.touches[0].clientX - startX;
          const dy = e.touches[0].clientY - startY;
          if (dx > 0 && Math.abs(dy) < 30) {
            el.classList.add('swiping-right');
            moved = true;
          }
        }
      };
      el.ontouchend = (e: TouchEvent) => {
        el.classList.remove('swiping-right');
        if (!moved) return;
        const endX = e.changedTouches[0].clientX;
        const dx = endX - startX;
        if (dx > 40 && Math.abs(e.changedTouches[0].clientY - startY) < 30) {
          // Trigger reply
          if (index < this.messages.length) {
            const message = this.messages[index];
            this.replyingTo = message;
            this.cancelSelection();
            setTimeout(() => {
              const inputElement = document.querySelector('ion-textarea');
              if (inputElement) {
                (inputElement as any).setFocus();
              }
            }, 300);
          }
        }
      };
      // Mouse events (desktop)
      let mouseDown = false;
      let mouseStartX = 0;
      let mouseStartY = 0;
      let mouseMoved = false;
      el.onmousedown = (e: MouseEvent) => {
        if (e.button === 0) {
          mouseDown = true;
          mouseStartX = e.clientX;
          mouseStartY = e.clientY;
          mouseMoved = false;
        }
      };
      el.onmousemove = (e: MouseEvent) => {
        if (mouseDown) {
          const dx = e.clientX - mouseStartX;
          const dy = e.clientY - mouseStartY;
          if (dx > 0 && Math.abs(dy) < 30) {
            el.classList.add('swiping-right');
            mouseMoved = true;
          }
        }
      };
      el.onmouseup = (e: MouseEvent) => {
        el.classList.remove('swiping-right');
        if (!mouseDown || !mouseMoved) {
          mouseDown = false;
          return;
        }
        const dx = e.clientX - mouseStartX;
        if (dx > 40 && Math.abs(e.clientY - mouseStartY) < 30) {
          // Trigger reply
          if (index < this.messages.length) {
            const message = this.messages[index];
            this.replyingTo = message;
            this.cancelSelection();
            setTimeout(() => {
              const inputElement = document.querySelector('ion-textarea');
              if (inputElement) {
                (inputElement as any).setFocus();
              }
            }, 300);
          }
        }
        mouseDown = false;
      };
    });
  }

  // Coba kirim ulang pesan yang gagal
  retryMessage(message: Message) {
    if (!message.sendFailed) return;
    
    // Hapus status gagal dan tambahkan status sending
    message.sendFailed = false;
    message.sending = true;
    
    // Kirim ulang pesan
    this.chatService.sendMessage(this.chatId, message.text).subscribe(
      (response) => {
        if (response.success) {
          // Temukan dan ganti pesan yang gagal dengan pesan baru
          const index = this.messages.findIndex(m => m.id === message.id);
          if (index !== -1) {
            // Tambahkan pesan baru dari respons
            const newMessage = response.data;
            
            // Ganti pesan lama dengan pesan baru
            this.messages[index] = newMessage;
            
            // Update lastMessageId jika perlu
            if (newMessage.id > this.lastMessageId) {
              this.lastMessageId = newMessage.id.toString();
            }
            
            this.presentToast('Pesan berhasil dikirim ulang');
          }
        } else {
          // Tandai kembali sebagai gagal terkirim
          message.sendFailed = true;
          message.sending = false;
          
          this.presentToast('Gagal mengirim ulang: ' + response.message);
        }
      },
      (error) => {
        // Tandai kembali sebagai gagal terkirim
        message.sendFailed = true;
        message.sending = false;
        
        this.presentToast('Gagal mengirim ulang: ' + error.message);
      }
    );
  }

  // Cek apakah dokumen sedang diunduh
  isDownloading(documentId: string): boolean {
    return this.downloadingDocuments.has(documentId);
  }

  // Cek apakah dokumen sudah diunduh
  isDownloaded(documentId: string): boolean {
    return this.downloadedDocuments.has(documentId);
  }

  // Membuka dokumen
  openDocument(document: any, sender: string) {
    if (!document || !document.url) {
      this.presentToast('URL dokumen tidak tersedia');
      return;
    }

    // Jika dokumen dari pengirim sendiri, buka langsung
    if (sender === 'me') {
      this.openDocumentInBrowser(document);
      return;
    }

    // Jika dokumen sudah diunduh sebelumnya, buka langsung
    if (this.downloadedDocuments.has(document.id)) {
      this.openDocumentInBrowser(document);
      return;
    }

    // Jika sedang mengunduh, tidak lakukan apa-apa
    if (this.downloadingDocuments.has(document.id)) {
      return;
    }

    // Mulai proses unduh
    this.downloadingDocuments.add(document.id);
    
    // Tampilkan loading toast dengan waktu lebih lama
    const loadingToast = this.toastCtrl.create({
      message: 'Mengunduh dokumen...',
      duration: 10000,
      position: 'bottom'
    });
    loadingToast.then(toast => toast.present());

    // Gunakan metode downloadAndSaveDocument untuk unduhan asinkron
    this.chatService.downloadAndSaveDocument(document.id)
      .then(result => {
        // Tutup loading toast
        loadingToast.then(toast => toast.dismiss());
        
        // Tandai dokumen sudah diunduh
        this.downloadingDocuments.delete(document.id);
        this.downloadedDocuments.add(document.id);
        
        // Simpan dokumen ke storage lokal jika diperlukan
        // Tambahkan kode untuk menyimpan blob ke penyimpanan lokal jika diperlukan
        
        // Tampilkan toast sukses
        this.presentToast('Dokumen berhasil diunduh');
        
        // Buka dokumen
        this.openDocumentInBrowser(document);
      })
      .catch(error => {
        // Tutup loading toast
        loadingToast.then(toast => toast.dismiss());
        
        // Hapus dari daftar downloading
        this.downloadingDocuments.delete(document.id);
        
        // Tampilkan pesan error
        console.error('Error downloading document:', error);
        this.presentToast('Gagal mengunduh dokumen: ' + (error.statusText || 'Kesalahan jaringan'));
      });
  }

  // Fungsi untuk membuka dokumen di browser
  private openDocumentInBrowser(document: any) {
    const downloadUrl = this.chatService.downloadDocument(document.id);
    
    // Cek apakah perangkat adalah mobile atau browser
    if (this.isMobile()) {
      // Buka dengan InAppBrowser atau Capacitor FileOpener jika tersedia
      this.openDocumentInMobile(downloadUrl, document);
    } else {
      // Buka di tab baru untuk browser desktop
      window.open(downloadUrl, '_blank');
    }
  }

  // Cek apakah perangkat adalah mobile
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Fungsi untuk membuka dokumen di perangkat mobile
  private async openDocumentInMobile(url: string, document: any) {
    try {
      // Gunakan Capacitor Browser untuk membuka dokumen
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
        await window.Capacitor.Plugins.Browser.open({ url: url });
      } else {
        // Fallback: buka di tab browser dengan _system agar menggunakan aplikasi default di perangkat
        window.open(url, '_system');
        
        // Jika _system tidak didukung, coba dengan _blank sebagai fallback
        setTimeout(() => {
          window.open(url, '_blank');
        }, 300);
      }
    } catch (error) {
      console.error('Error opening document:', error);
      this.presentToast('Gagal membuka dokumen. Silakan coba unduh melalui browser.');
      
      // Fallback: buka di tab browser jika terjadi error
      window.open(url, '_blank');
    }
  }

  // Metode untuk memuat kata-kata terlarang dari file CSV
  private loadForbiddenWords() {
    this.http.get('assets/forbiden.csv', { responseType: 'text' })
      .subscribe({
        next: (data) => {
          // Parsing CSV sederhana
          const lines = data.split('\n');
          // Skip header jika ada
          const startIndex = lines[0].trim().toLowerCase() === 'kata' ? 1 : 0;
          
          // Ambil kata-kata dari setiap baris
          this.forbiddenWords = lines.slice(startIndex)
            .map(line => line.trim())
            .filter(word => word.length > 0); // Filter baris kosong
            
          console.log(`Loaded ${this.forbiddenWords.length} forbidden words`);
        },
        error: (err) => {
          console.error('Error loading forbidden words:', err);
          // Gunakan daftar default jika gagal memuat dari file
          this.initDefaultForbiddenWords();
        }
      });
  }
  
  // Metode untuk menginisialisasi daftar kata terlarang default jika gagal memuat dari file
  private initDefaultForbiddenWords() {
    this.forbiddenWords = [
      'anjing', 'sialan', 'bangsat', 'tai', 'tahi', 'pepek', 'mmk', 'memek', 
      'kontol', 'kntl', 'bajingan', 'bunuh', 'fuck', 'shit', 'bitch', 'ass', 
      'asshole', 'goblok', 'tolol', 'bego', 'idiot', 'keparat'
    ];
    console.log('Using default forbidden words list');
  }
}
