import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService, Message } from '../../../services/chat.service';
import { ToastController, ActionSheetController, AlertController, Platform, IonContent, NavController } from '@ionic/angular';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription, interval, of } from 'rxjs';
import { catchError, take, tap, map, debounceTime, filter } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';

@Component({
  selector: 'app-viewchat-satpam',
  templateUrl: './viewchat-satpam.page.html',
  styleUrls: ['./viewchat-satpam.page.scss'],
  standalone: false,
})
export class ViewchatSatpamPage implements OnInit, AfterViewInit {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('imageInput') imageInput!: ElementRef;
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  
  chatId: string = '';
  otherUser: any = {
    name: '',
    avatar: 'https://ionicframework.com/docs/img/demos/avatar.svg',
    status: 'Offline'
  };
  messages: Message[] = [];
  newMessage: string = '';
  isLoading: boolean = true;
  isTyping: boolean = false;
  isSelectionMode: boolean = false;
  selectedMessages: Message[] = [];
  replyingTo: Message | null = null;
  isScrollToBottomNeeded: boolean = true;
  isImageViewerOpen: boolean = false;
  viewerImage: string = '';
  now = new Date();
  
  // For image preview
  selectedImage: File | null = null;
  selectedImagePreview: string | null = null;
  
  // For document preview
  selectedDocument: File | null = null;
  
  // For file upload
  fileUploadProgress: number = 0;
  showUploadProgress: boolean = false;
  
  // Polling for new messages
  private pollingSubscription?: Subscription;
  private refreshMessagesInterval: number = 2000; // 2 detik, lebih responsif dari sebelumnya

  // Metode untuk mengawasi polling
  private _pollingMonitorInterval: any;
  
  // Cache control untuk throttling
  private _lastPollingAttempt: number = 0;
  private _lastMessageId: string = '';
  private _consecutiveEmptyResults: number = 0;
  private _consecutiveErrors: number = 0;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController,
    private alertController: AlertController,
    private platform: Platform,
    private sanitizer: DomSanitizer,
    private ngZone: NgZone,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    console.log('ViewchatSatpamPage: ngOnInit');
    
    // Ambil ID chat dari parameter URL
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.chatId = id;
        console.log(`Chat ID: ${this.chatId}`);
        this.loadChatData();
      } else {
        console.error('No chat ID provided');
        this.presentToast('ID chat tidak valid');
        this.goBack();
      }
    });
    
    // Sembunyikan tab bar saat halaman chat dibuka
    this.hideTabBar();
    
    // Setup keyboard handling
    this.setupKeyboardListeners();
  }
  
  ionViewWillEnter() {
    console.log('ViewchatSatpamPage: ionViewWillEnter');
    
    // Sembunyikan tab bar saat halaman akan ditampilkan
    this.hideTabBar();
    
    // Force refresh pesan saat masuk ke halaman
    this.forceRefreshMessages();
    
    // Mulai polling jika data chat sudah dimuat
    if (this.messages.length > 0) {
      if (!this.pollingSubscription || this.pollingSubscription.closed) {
        console.log('Starting polling in ionViewWillEnter - chat already loaded');
        this.startPollingForNewMessages();
      } else {
        console.log('Polling already active, forcing immediate check');
        // Paksa pengecekan pesan baru segera
        this.forceRefreshMessages();
      }
    }
    
    // Mark messages as read jika sudah ada pesan
    if (this.messages.length > 0) {
      this.markMessagesAsRead();
    }
    
    // Setup visibility change listener untuk mendeteksi saat tab browser aktif kembali
    this.setupVisibilityListener();
  }
  
  ionViewWillLeave() {
    console.log('ViewchatSatpamPage: ionViewWillLeave');
    
    // Tampilkan kembali tab bar saat meninggalkan halaman
    this.showTabBar();
    
    // Hentikan polling untuk mencegah memory leak
    console.log('Leaving view, stopping polling');
    this.stopPollingForNewMessages();
  }

  ngOnDestroy() {
    console.log('ViewchatSatpamPage: ngOnDestroy');
    
    // Tampilkan kembali tab bar dan hentikan polling
    this.showTabBar();
    console.log('Destroying component, stopping polling');
    this.stopPollingForNewMessages();
    
    // Remove keyboard event listeners
    window.removeEventListener('ionKeyboardDidShow', () => {});
    
    // Clear any interval
    if (this._pollingMonitorInterval) {
      clearInterval(this._pollingMonitorInterval);
      this._pollingMonitorInterval = undefined;
    }
    
    // Remove visibility change listener
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  // Metode untuk menyembunyikan tab bar
  hideTabBar() {
    const tabBar = document.querySelector('ion-tab-bar');
    if (tabBar) {
      tabBar.style.display = 'none';
    }
  }
  
  // Metode untuk menampilkan tab bar
  showTabBar() {
    const tabBar = document.querySelector('ion-tab-bar');
    if (tabBar) {
      tabBar.style.display = 'flex';
    }
  }

  // Metode untuk mengawasi polling
  private setupPollingMonitor() {
    console.log('Setting up polling monitor');
    
    // Clear any existing interval
    if (this._pollingMonitorInterval) {
      clearInterval(this._pollingMonitorInterval);
    }
    
    // Buat variabel private untuk interval polling monitor
    this._pollingMonitorInterval = setInterval(() => {
      this.checkPollingStatus();
    }, 7000); // Check every 7 seconds
    
    console.log('Polling monitor is active');
  }
  
  // Memeriksa apakah polling berjalan dan memulai ulang jika berhenti
  private checkPollingStatus() {
            const now = new Date().getTime();
    
    // Jika polling tidak aktif atau telah lebih dari 10 detik sejak polling terakhir
    if (!this.pollingSubscription || 
        this.pollingSubscription.closed || 
        (now - this._lastPollingAttempt > 10000)) {
      
      console.warn('Polling issues detected, restarting...', {
        hasSubscription: !!this.pollingSubscription,
        isClosed: this.pollingSubscription?.closed,
        timeSinceLastAttempt: now - this._lastPollingAttempt
      });
      
      this.forceRestartPolling();
    }
  }

  private stopPollingForNewMessages() {
    try {
      console.log('Stopping polling for new messages');
      
      // Hentikan interval monitor polling
      if (this._pollingMonitorInterval) {
        console.log('Clearing polling monitor interval');
        clearInterval(this._pollingMonitorInterval);
        this._pollingMonitorInterval = undefined;
      }
      
      // Hentikan subscription polling
      if (this.pollingSubscription) {
        console.log('Unsubscribing from polling subscription');
        this.pollingSubscription.unsubscribe();
        this.pollingSubscription = undefined;
        console.log('Polling subscription unsubscribed');
      } else {
        console.log('No active polling subscription to stop');
      }
    } catch (error) {
      console.error('Error stopping polling:', error);
      this.pollingSubscription = undefined;
    }
  }
  
  /**
   * Paksa restart polling jika terjadi masalah
   */
  private forceRestartPolling() {
    console.log('Force restarting polling...');
    
    // Hentikan polling yang sedang berjalan
    this.stopPollingForNewMessages();
    
    // Reset counter error dan empty results
    this._consecutiveErrors = 0;
    this._consecutiveEmptyResults = 0;
    
    // Reset polling interval ke default
    this.refreshMessagesInterval = 2000;
    
    // Mulai ulang polling
    setTimeout(() => {
      this.startPollingForNewMessages();
    }, 1000);
  }
  
  /**
   * Memulai polling untuk pesan baru
   */
  private startPollingForNewMessages() {
    // Bersihkan subscription yang ada
    this.stopPollingForNewMessages();
    
    const refreshInterval = this.refreshMessagesInterval;
    console.log(`Starting polling with interval: ${refreshInterval}ms`);
    
    // Polling menggunakan interval dari rxjs dengan debounce
    this.pollingSubscription = interval(refreshInterval)
      .pipe(
        // Tambahkan debounce untuk mencegah terlalu banyak request
        debounceTime(300),
        // Hanya lanjutkan jika halaman aktif
        filter(() => !document.hidden)
      )
      .subscribe(() => {
        // Cek waktu terakhir polling, jika terlalu dekat dengan waktu sekarang, lewati
        const now = Date.now();
        if (now - this._lastPollingAttempt < 1000) {
          console.log('Skipping polling, too soon after last attempt');
          return;
        }
        
        // Gunakan ID pesan terakhir untuk polling
        const lastMessageId = this._lastMessageId || '0';
        
        // Polling
        this.checkForNewMessages(lastMessageId)
          .pipe(take(1))
          .subscribe();
      });
    
    // Setup monitor untuk memastikan polling tetap berjalan
    this.setupPollingMonitor();
  }

  /**
   * Memeriksa apakah ada pesan baru
   * @param lastMessageId - ID pesan terakhir yang diterima
   */
  private checkForNewMessages(lastMessageId: string): Observable<any> {
    if (!this.chatId) {
      return of({ success: false, messages: [] }); // Return Observable kosong jika tidak ada chatId
    }
    
    this._lastPollingAttempt = Date.now();
    
    return this.chatService.getSatpamNewMessages(this.chatId, lastMessageId).pipe(
      map((response: {success: boolean, messages: any[]}) => {
        if (response.success) {
          const newMessages = response.messages;
          
          if (newMessages && newMessages.length > 0) {
            // Reset counter untuk hasil kosong
            this._consecutiveEmptyResults = 0;
            
            // Proses messages baru untuk menggunakan URL lengkap pada gambar
            const processedMessages = newMessages.map((msg: any) => {
              // Jika ada image, pastikan menggunakan URL lengkap
              if (msg.image && !msg.image.startsWith('http')) {
                msg.image = `${environment.storageUrl}/${msg.image}`;
              }
              
              // Jika ada dokumen, pastikan URL lengkap
              if (msg.document && msg.document.url && !msg.document.url.startsWith('http')) {
                msg.document.url = `${environment.storageUrl}/${msg.document.url}`;
              }
              
              // Update lastMessageId untuk polling berikutnya
              if (msg.id) {
                this._lastMessageId = msg.id;
              }
              
              return msg;
            });
            
            // Tambahkan pesan baru ke daftar pesan
            this.messages = [...this.messages, ...processedMessages];
            
            // Perbarui jumlah pesan yang belum dibaca
            this.updateUnreadCount();
            
            // Tandai pesan sebagai sudah dibaca
            this.markMessagesAsRead();
            
            // Scroll ke bawah jika diperlukan
            setTimeout(() => {
              if (this.isScrollToBottomNeeded) {
                this.scrollToBottom();
              } else {
                // Tampilkan notifikasi pesan baru
                this.showNewMessageToast(processedMessages.length);
              }
            }, 100);
          } else {
            // Tambahkan counter jika tidak ada pesan baru
            this._consecutiveEmptyResults++;
            
            // Jika terlalu banyak hasil kosong, kurangi frekuensi polling
            if (this._consecutiveEmptyResults > 10) {
              // Setiap 10 hasil kosong, kurangi frekuensi polling
              this.refreshMessagesInterval = Math.min(10000, this.refreshMessagesInterval * 1.2);
              console.log(`Adjusting polling interval to ${this.refreshMessagesInterval}ms after ${this._consecutiveEmptyResults} empty results`);
            }
          }
        }
        
        return response;
      }),
      catchError(error => {
        // Tambahkan counter error
        this._consecutiveErrors++;
        
        console.error('Error checking for new messages:', error);
        
        // Jika error bertambah, restart polling
        if (this._consecutiveErrors >= 3) {
          this.forceRestartPolling();
        }
        
        return of({ success: false, messages: [] });
      })
    );
  }

  loadChatData() {
    this.isLoading = true;
    
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.chatId = id;
        
        // Tambahkan timestamp untuk mencegah cache
        const timestamp = Date.now();
        
        // Ambil data chat dari API
        this.chatService.getSatpamChat(this.chatId, timestamp).subscribe({
          next: (response: {
            chatId: string;
            otherUser: any;
            messages: Message[];
          }) => {
            if (response.chatId) {
              this.otherUser = response.otherUser;
              
              // Transformasi messages untuk menggunakan URL lengkap pada gambar
              const messages = response.messages.map((msg: Message) => {
                // Jika ada image, pastikan menggunakan URL lengkap
                if (msg.image && !msg.image.startsWith('http')) {
                  msg.image = `${environment.storageUrl}/${msg.image}`;
                }
                
                // Jika ada replyTo dengan image, pastikan juga URL-nya lengkap
                if (msg.replyTo && msg.replyTo.image && !msg.replyTo.image.startsWith('http')) {
                  msg.replyTo.image = `${environment.storageUrl}/${msg.replyTo.image}`;
                }
                
                // Jika ada dokumen, pastikan URL-nya lengkap
                if (msg.document && msg.document.url && !msg.document.url.startsWith('http')) {
                  msg.document.url = `${environment.storageUrl}/${msg.document.url}`;
                }
                
                return msg;
              });
              
              this.messages = messages;
              
              // Update ID pesan terakhir untuk polling
              if (this.messages.length > 0) {
                this._lastMessageId = this.messages[this.messages.length - 1].id;
              }
              
              // Tandai pesan sebagai sudah dibaca
              this.markMessagesAsRead();
              
              // Scroll ke bawah setelah data dimuat
              setTimeout(() => {
                this.scrollToBottom();
              }, 500);
              
              // Mulai polling untuk pesan baru
              this.startPollingForNewMessages();
            }
            
            this.isLoading = false;
          },
          error: (error: any) => {
            console.error('Error loading chat data:', error);
            this.isLoading = false;
            
            // Tampilkan toast error
            this.presentToast('Gagal memuat data chat. Silakan coba lagi.');
            
            // Coba mulai polling meskipun gagal load awal
            if (this.chatId) {
              setTimeout(() => {
                this.startPollingForNewMessages();
              }, 3000); // Tunggu 3 detik sebelum mencoba polling
            }
          }
        });
      } else {
        this.isLoading = false;
      }
    });
  }

  markMessagesAsRead() {
    // Mark messages as read on the server
    this.chatService.markSatpamAsRead(this.chatId)
      .subscribe({
        next: () => {
          // Update UI to show messages as read
          this.messages.forEach(message => {
            if (message.sender === 'other') {
              message.read = true;
            }
          });
          
          // Memperbarui total unread count di service
          this.updateUnreadCount();
        },
        error: (error) => {
          console.error('Error marking messages as read:', error);
        }
      });
  }
  
  // Helper method untuk memperbarui unread count setelah membaca pesan
  private updateUnreadCount() {
    // Ambil daftar chat terbaru untuk mendapatkan jumlah pesan belum dibaca yang akurat
    this.chatService.getSatpamChatList(new Date().getTime())
      .subscribe({
        next: (chats) => {
          const totalUnread = chats.reduce((total, chat) => total + chat.unread, 0);
          this.chatService.setUnreadCount(totalUnread);
        },
        error: (error) => {
          console.warn('Failed to update unread count:', error);
        }
      });
  }
  
  // Baru! Method untuk menampilkan toast tentang pesan baru
  private showNewMessageToast(count: number) {
    this.presentToast(`${count} pesan baru dari ${this.otherUser.name}`);
  }
  
  // Baru! Method untuk memainkan suara notifikasi
  private playNotificationSound() {
    try {
      const audio = new Audio('assets/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play();
    } catch (error) {
      console.log('Error playing notification sound:', error);
    }
  }

  // Sisanya dari kode tetap sama...

  canSendMessage(): boolean {
    return (!!this.newMessage && this.newMessage.trim() !== '') || 
           !!this.selectedImage || 
           !!this.selectedDocument;
  }

  sendMessage() {
    // Validasi input
    if (!this.canSendMessage()) {
      return;
    }
    
    // Simpan pesan yang akan dikirim
    const messageText = this.newMessage.trim();
    const replyToId = this.replyingTo ? this.replyingTo.id : undefined;
    
    // Reset input dan reply state
    this.newMessage = '';
    this.cancelReply();
    
    // Hapus attachment jika ada
    const imageFile = this.selectedImage;
    const documentFile = this.selectedDocument;
    this.clearAttachments();
    
    // Buat ID sementara untuk pesan
    const tempId = `temp_${new Date().getTime()}`;
    
    // Tambahkan pesan ke array dengan status 'sending'
    const tempMessage: Message = {
      id: tempId,
      text: messageText,
      time: new Date().toISOString(),
      sender: 'me',
      read: false,
      created_at: new Date().toISOString(),
      sending: true
    };
    
    // Jika ada gambar, tambahkan preview
    if (imageFile) {
      tempMessage.image = this.selectedImagePreview || undefined;
    }
    
    // Jika ada dokumen, tambahkan info dokumen
    if (documentFile) {
      tempMessage.document = {
        id: tempId,
        name: documentFile.name,
        size: this.formatFileSize(documentFile.size),
        type: documentFile.type.split('/')[1] || 'file',
        url: ''
      };
    }
    
    // Tambahkan pesan ke array pesan
    this.messages.push(tempMessage);
    
    // Scroll ke bawah
    this.scrollToBottom();
    
    // Kirim pesan ke server
    this.chatService.sendSatpamMessage(this.chatId, messageText, replyToId, imageFile || undefined, documentFile || undefined)
      .subscribe({
        next: (response) => {
          console.log('Message sent successfully:', response);
          
          // Hapus pesan sementara
          const index = this.messages.findIndex(m => m.id === tempId);
          if (index !== -1) {
            this.messages.splice(index, 1);
          }
          
          // Tambahkan pesan yang sebenarnya dari response
          if (response && response.data) {
            const realMessage: Message = {
              id: response.data.id,
              text: response.data.text || messageText,
              time: response.data.time || new Date().toISOString(),
              sender: 'me',
              read: false,
              created_at: response.data.created_at || new Date().toISOString(),
              image: response.data.image,
              document: response.data.document
            };
            
            // Jika ada image, pastikan menggunakan URL lengkap
            if (realMessage.image && !realMessage.image.startsWith('http')) {
              realMessage.image = `${environment.storageUrl}/${realMessage.image}`;
            }
            
            // Jika ada dokumen, pastikan URL lengkap
            if (realMessage.document && realMessage.document.url && !realMessage.document.url.startsWith('http')) {
              realMessage.document.url = `${environment.storageUrl}/${realMessage.document.url}`;
            }
            
            // Tambahkan pesan ke daftar
            this.messages.push(realMessage);
            
            // Update ID pesan terakhir untuk polling
            this._lastMessageId = realMessage.id;
            
            // Scroll ke bawah
            this.scrollToBottom();
          }
        },
        error: (error) => {
          console.error('Error sending message:', error);
          
          // Tandai pesan sebagai gagal terkirim
          const index = this.messages.findIndex(m => m.id === tempId);
          if (index !== -1) {
            this.messages[index].sending = false;
            this.messages[index].sendFailed = true;
          }
          
          // Tampilkan toast error
          this.presentToast('Gagal mengirim pesan. Silakan coba lagi.');
        }
      });
  }

  retryFailedMessage(message: Message) {
    // Remove the failed message
    this.messages = this.messages.filter(m => m.id !== message.id);
    
    // Reinstate the text in the input field
    this.newMessage = message.text;
    
    // Re-add replyTo if it existed
    if (message.replyTo) {
      const originalMessage = this.messages.find(m => m.id === message.replyTo?.id);
      if (originalMessage) {
        this.replyingTo = originalMessage;
      }
    }
  }

  selectMessage(message: Message) {
    if (!this.isSelectionMode) {
      // Enter selection mode
      this.isSelectionMode = true;
      message.selected = true;
      this.selectedMessages = [message];
    } else {
      // Toggle selection
      message.selected = !message.selected;
      
      if (message.selected) {
        this.selectedMessages.push(message);
      } else {
        this.selectedMessages = this.selectedMessages.filter(m => m.id !== message.id);
        
        // Exit selection mode if no messages selected
        if (this.selectedMessages.length === 0) {
          this.exitSelectionMode();
        }
      }
    }
  }

  exitSelectionMode() {
    this.isSelectionMode = false;
    this.selectedMessages = [];
    this.messages.forEach(message => message.selected = false);
  }

  async presentMessageOptions(message: Message, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    const isMyMessage = message.sender === 'me';
    
    const actionSheet = await this.actionSheetController.create({
      header: 'Opsi Pesan',
      buttons: [
        {
          text: 'Balas',
          icon: 'arrow-undo-outline',
          handler: () => {
            this.replyToMessage(message);
          }
        },
        {
          text: 'Salin',
          icon: 'copy-outline',
          handler: () => {
            this.copyMessageText(message);
          }
        },
        // Only show delete option for own messages
        ...(isMyMessage ? [{
          text: 'Hapus',
          icon: 'trash-outline',
          handler: () => {
            this.confirmDeleteMessage(message);
          }
        }] : []),
        {
          text: 'Batal',
          icon: 'close-outline',
          role: 'cancel'
        }
      ]
    });
    
    await actionSheet.present();
  }
  
  replyToMessage(message: Message) {
    this.replyingTo = message;
    // Focus on input field
    setTimeout(() => {
      const inputElement = document.querySelector('ion-textarea');
      if (inputElement) {
        inputElement.setFocus();
      }
    }, 100);
  }

  cancelReply() {
    this.replyingTo = null;
  }

  copyMessageText(message: Message) {
    if (message.text) {
      navigator.clipboard.writeText(message.text)
        .then(() => {
          this.presentToast('Teks telah disalin');
        })
        .catch(err => {
          console.error('Gagal menyalin teks:', err);
          this.presentToast('Gagal menyalin teks');
        });
    }
  }

  async confirmDeleteMessage(message: Message) {
    const alert = await this.alertController.create({
      header: 'Hapus Pesan',
      message: 'Apakah Anda yakin ingin menghapus pesan ini?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          handler: () => {
            this.deleteMessage(message);
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  deleteMessage(message: Message) {
    // Optimistic UI update - remove the message from the UI first
    this.messages = this.messages.filter(m => m.id !== message.id);
    
    // Then send the delete request to the server
    this.chatService.deleteSatpamMessage(message.id)
      .subscribe({
        next: () => {
          this.presentToast('Pesan telah dihapus');
        },
        error: (error) => {
          console.error('Error deleting message:', error);
          
          // Re-add the message to the UI if the server request failed
          this.messages.push(message);
          
          // Re-sort messages by creation time
          this.messages.sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
          
          this.presentToast('Gagal menghapus pesan. Silakan coba lagi.');
        }
      });
  }

  async deleteSelectedMessages() {
    if (this.selectedMessages.length === 0) return;
    
    const alert = await this.alertController.create({
      header: 'Hapus Pesan',
      message: `Apakah Anda yakin ingin menghapus ${this.selectedMessages.length} pesan yang dipilih?`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          handler: async () => {
            // Optimistic UI update - remove selected messages from UI first
              const selectedIds = this.selectedMessages.map(m => m.id);
            const deletedMessages = [...this.selectedMessages]; // Save copy for potential rollback
            this.messages = this.messages.filter(m => !selectedIds.includes(m.id));
            
            // Exit selection mode
            this.exitSelectionMode();
            
            // Delete each message one by one
            for (const message of deletedMessages) {
              try {
                await new Promise<void>((resolve, reject) => {
                  this.chatService.deleteSatpamMessage(message.id).subscribe({
                    next: () => resolve(),
                    error: (err) => reject(err)
                  });
                });
              } catch (error) {
                console.error('Error deleting message:', error);
                
                // Re-add failed message to the UI
                this.messages.push(message);
                
                // Re-sort messages by creation time
                this.messages.sort((a, b) => {
                  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                });
                
                this.presentToast('Beberapa pesan gagal dihapus');
                break;
              }
            }
            
            this.presentToast('Pesan terpilih telah dihapus');
          }
        }
      ]
    });
    
    await alert.present();
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  scrollToBottom() {
    if (this.isScrollToBottomNeeded && this.content) {
      setTimeout(() => {
        this.content.scrollToBottom(300);
      }, 100);
    }
  }

  onScroll(event: any) {
    // Check if user is scrolled to bottom
    const scrollElement = event.detail.scrollElement;
    const scrollPosition = scrollElement.scrollTop + scrollElement.clientHeight;
    const scrollHeight = scrollElement.scrollHeight;
    
    // Set flag to scroll to bottom when new messages arrive only if already at bottom
    this.isScrollToBottomNeeded = Math.abs(scrollPosition - scrollHeight) < 50;
  }

  // Image handling
  async selectImage() {
    try {
      // Minta izin akses galeri terlebih dahulu
      if (this.platform?.is('capacitor') || this.platform?.is('cordova')) {
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

    this.imageInput.nativeElement.click();
    } catch (err) {
      console.error('Error accessing camera/gallery:', err);
      this.presentToast('Terjadi kesalahan saat mengakses galeri');
    }
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    
    if (file) {
      if (file.type.includes('image')) {
        this.selectedImage = file;
        
        // Reset dokumen jika ada
        if (this.selectedDocument) {
          this.removeSelectedDocument();
        }
        
        // Baca file sebagai Data URL
        const reader = new FileReader();
        reader.onload = () => {
          this.ngZone.run(() => {
            this.selectedImagePreview = reader.result as string;
          });
        };
        reader.readAsDataURL(file);
      } else {
        this.presentToast('File yang dipilih bukan gambar');
        this.removeSelectedImage();
      }
    }
  }

  removeSelectedImage() {
    this.selectedImage = null;
    this.selectedImagePreview = null;
  }

  // Document handling
  async selectDocument() {
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

    this.fileInput.nativeElement.click();
    } catch (err) {
      console.error('Error accessing file storage:', err);
      this.presentToast('Terjadi kesalahan saat mengakses penyimpanan file');
    }
  }

  onDocumentSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Check file size
      if (file.size > 10 * 1024 * 1024) {
        this.presentToast('Ukuran file terlalu besar. Maksimal 10MB');
        return;
      }
      
      // Check file type (optional)
      const validDocumentTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
      ];
      
      if (!validDocumentTypes.includes(file.type)) {
        this.presentToast('Format file mungkin tidak didukung. Lanjutkan?');
      }
      
      this.selectedDocument = file;
      
      // Clear any selected image
      this.selectedImage = null;
      this.selectedImagePreview = null;
    }
  }

  removeSelectedDocument() {
    this.selectedDocument = null;
  }

  clearAttachments() {
    this.selectedImage = null;
    this.selectedImagePreview = null;
    this.selectedDocument = null;
    
    // Reset file inputs
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    
    if (this.imageInput && this.imageInput.nativeElement) {
      this.imageInput.nativeElement.value = '';
    }
  }

  // View image
  viewImage(imageUrl: string) {
    // Jika URL relatif, tambahkan storage URL
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${environment.storageUrl}/${imageUrl.replace('/storage/', '')}`;
    }
    this.viewerImage = imageUrl;
    this.isImageViewerOpen = true;
  }

  closeImageViewer() {
    this.isImageViewerOpen = false;
    this.viewerImage = '';
  }

  // Download document
  downloadDocument(documentId: string) {
    // Gunakan metode downloadSatpamDocument dari service
    const url = this.chatService.downloadSatpamDocument(documentId);
    window.open(url, '_blank');
  }

  // Navigation
  goBack() {
    this.navCtrl.back();
  }

  async openUserProfile() {
    // Implementation depends on your profile view
    console.log('Open user profile:', this.otherUser);
  }

  // Additional features
  async clearAllMessages() {
    const alert = await this.alertController.create({
      header: 'Hapus Semua Pesan',
      message: 'Apakah Anda yakin ingin menghapus semua pesan dalam chat ini?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Hapus',
          handler: () => {
            this.chatService.clearChat(this.chatId)
              .subscribe({
                next: () => {
                  this.messages = [];
                  this.presentToast('Semua pesan telah dihapus');
                },
                error: (error) => {
                  console.error('Error clearing chat:', error);
                  this.presentToast('Gagal menghapus pesan. Silakan coba lagi.');
                }
              });
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  async blockUser() {
    const alert = await this.alertController.create({
      header: 'Blokir Pengguna',
      message: `Apakah Anda yakin ingin memblokir ${this.otherUser.name}?`,
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Blokir',
          handler: () => {
            // Implement block user functionality
            this.presentToast(`${this.otherUser.name} telah diblokir`);
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  // Helper methods
  getMessageClasses(message: Message) {
    return {
      'message-wrapper': true,
      'outgoing': message.sender === 'me',
      'incoming': message.sender === 'other',
      'selected': message.selected,
      'sending': message.sending,
      'send-failed': message.sendFailed,
      'has-image': !!message.image && (message.image.startsWith('/chat/images/') ? message.image : '/chat/images/' + message.image.replace(/^\/+/, '')),
      'has-document': !!message.document,
      'has-reply': !!message.replyTo
    };
  }

  getTimeFormatted(date: string): string {
    try {
      const messageDate = new Date(date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Same day - show time only
      if (messageDate.toDateString() === today.toDateString()) {
        return messageDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
      }
      
      // Yesterday - show "Kemarin" + time
      if (messageDate.toDateString() === yesterday.toDateString()) {
        return `Kemarin ${messageDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}`;
      }
      
      // This week - show day name + time
      const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        return `${messageDate.toLocaleDateString('id-ID', {weekday: 'long'})} ${messageDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}`;
      }
      
      // Older - show date + time
      return `${messageDate.toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'})} ${messageDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return date;
    }
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Sanitize image URL for security
  sanitizeImageUrl(url: string) {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  // Get message status text
  getMessageStatus(message: Message): string {
    if (message.sending) return '<ion-icon name="time-outline"></ion-icon>';
    if (message.sendFailed) return '<ion-icon name="alert-circle-outline" color="danger"></ion-icon>';
    if (message.read) return '<ion-icon name="checkmark-done-outline" color="primary"></ion-icon>';
    return '<ion-icon name="checkmark-outline"></ion-icon>';
  }

  // Get document icon based on type
  getDocumentIcon(type: string | undefined): string {
    if (!type) return 'document-outline';
    
    if (type.includes('pdf')) return 'document-text-outline';
    if (type.includes('word') || type.includes('doc')) return 'document-text-outline';
    if (type.includes('sheet') || type.includes('excel') || type.includes('xls')) return 'grid-outline';
    if (type.includes('presentation') || type.includes('powerpoint') || type.includes('ppt')) return 'easel-outline';
    if (type.includes('image')) return 'image-outline';
    if (type.includes('audio')) return 'musical-note-outline';
    if (type.includes('video')) return 'videocam-outline';
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'archive-outline';
    
        return 'document-outline';
  }

  ngAfterViewInit() {
      setTimeout(() => {
      this.scrollToBottom();
    }, 500);
  }

  // New method to show document toast
  async showDocumentToast() {
    const toast = await this.toastController.create({
      message: 'Fitur dokumen sedang dalam pengembangan',
      duration: 2000,
      position: 'bottom',
      color: 'warning',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  // Setup keyboard handling
  private setupKeyboardListeners() {
    // Listen for keyboard open events
    window.addEventListener('ionKeyboardDidShow', (event: any) => {
      // Scroll to bottom when keyboard opens
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
    });
  }

  /**
   * Memaksa refresh pesan dari server
   */
  private forceRefreshMessages() {
    if (!this.chatId) return;
    
    this.isLoading = true;
    
    // Tambahkan timestamp untuk mencegah cache
    const timestamp = Date.now();
    
    // Ambil chat detail dari API
    this.chatService.getSatpamChat(this.chatId, timestamp).subscribe({
      next: (response) => {
        if (response && response.chatId) {
          this.otherUser = response.otherUser;
          
          // Tambahkan semua pesan ke daftar
          const messages = response.messages.map(msg => {
            // Jika ada image, pastikan menggunakan URL lengkap
            if (msg.image && !msg.image.startsWith('http')) {
              msg.image = `${environment.storageUrl}/${msg.image}`;
            }
            
            // Jika ada replyTo dan image, pastikan URL-nya lengkap
            if (msg.replyTo && msg.replyTo.image && !msg.replyTo.image.startsWith('http')) {
              msg.replyTo.image = `${environment.storageUrl}/${msg.replyTo.image}`;
            }
            
            return msg;
          });
          
          this.messages = messages;
          
          // Update ID pesan terakhir untuk polling
          if (this.messages.length > 0) {
            this._lastMessageId = this.messages[this.messages.length - 1].id;
          }
          
          // Reset counters
          this._consecutiveEmptyResults = 0;
          this._consecutiveErrors = 0;
          
          // Restore polling interval ke default
          this.refreshMessagesInterval = 2000;
          
          // Restart polling
          this.startPollingForNewMessages();
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error refreshing messages:', error);
        this.isLoading = false;
        
        // Tampilkan toast error
        this.presentToast('Gagal memuat pesan. Silakan coba lagi.');
      }
    });
  }

  // Tambahkan metode untuk mendeteksi perubahan visibilitas halaman
  private setupVisibilityListener() {
    // Remove existing listener jika ada
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Add new listener
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  // Handler untuk perubahan visibilitas
  private handleVisibilityChange = () => {
    if (!document.hidden) {
      console.log('Tab became visible, forcing message refresh');
      this.forceRefreshMessages();
    }
  };
} 