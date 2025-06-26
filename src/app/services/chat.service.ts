import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  muted?: boolean;
  other_user_id: string;
  is_online: boolean;
  last_active_timestamp?: string;
  selected?: boolean;
}

export interface Message {
  id: string;
  text: string;
  time: string;
  sender: 'me' | 'other' | 'system';
  read: boolean;
  created_at: string;
  image?: string;
  document?: {
    id: string;
    name: string;
    size: string;
    type: string;
    url: string;
  };
  replyTo?: {
    id: string;
    text: string;
    sender: 'me' | 'other' | 'system';
    image?: string;
    document?: {
      id: string;
      name: string;
      size: string;
      type: string;
      url: string;
    };
  };
  selected?: boolean;
  sending?: boolean;
  sendFailed?: boolean;
  isLocalWarning?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.apiUrl;

  // Tambahkan subject untuk unread count
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();
  
  // Debounce timer untuk menghindari update yang terlalu sering
  private unreadCountDebounceTimer: any;
  
  /**
   * Set jumlah pesan yang belum dibaca dengan debounce
   * @param count - Jumlah pesan yang belum dibaca
   */
  setUnreadCount(count: number) {
    // Clear timer sebelumnya (jika ada)
    if (this.unreadCountDebounceTimer) {
      clearTimeout(this.unreadCountDebounceTimer);
    }
    
    // Set value dengan debounce 300ms
    this.unreadCountDebounceTimer = setTimeout(() => {
      // Hanya update jika nilai berbeda untuk menghindari perubahan yang tidak perlu
      if (this.unreadCountSubject.value !== count) {
        console.log('Updating unread count:', count);
    this.unreadCountSubject.next(count);
  }
    }, 300);
  }

  constructor(private http: HttpClient) {
    // Inisialisasi unread count saat service dibuat
    this.initUnreadCount();
  }

  /**
   * Inisialisasi unread count saat aplikasi dimulai
   * Metode ini akan dipanggil otomatis saat service dibuat
   */
  private initUnreadCount() {
    // Cek peran pengguna (warga atau satpam)
    const userRole = localStorage.getItem('user_role') || '';
    
    // Ambil daftar chat sesuai peran
    if (userRole.toLowerCase() === 'satpam') {
      this.getSatpamChatList(new Date().getTime()).subscribe({
        next: (chats) => {
          const totalUnread = chats.reduce((total, chat) => total + chat.unread, 0);
          this.setUnreadCount(totalUnread);
        },
        error: (error) => {
          console.error('Error initializing unread count:', error);
          this.setUnreadCount(0);
        }
      });
    } else {
      // Default untuk warga atau peran lain
      this.getChatList(new Date().getTime()).subscribe({
        next: (chats) => {
          const totalUnread = chats.reduce((total, chat) => total + chat.unread, 0);
          this.setUnreadCount(totalUnread);
        },
        error: (error) => {
          console.error('Error initializing unread count:', error);
          this.setUnreadCount(0);
        }
      });
    }
  }

  /**
   * Mendapatkan daftar chat untuk Warga
   * @param timestamp - Timestamp untuk mencegah caching (opsional)
   */
  getChatList(timestamp?: number): Observable<Chat[]> {
    const url = timestamp 
      ? `${this.apiUrl}/api/warga/chat/list?_=${timestamp}` 
      : `${this.apiUrl}/api/warga/chat/list`;
      
    return this.http.post<any>(url, {}).pipe(
        map(response => {
        if (response && response.success && response.chats) {
          return response.chats.map((chat: any): Chat => ({
            id: chat.id,
            name: chat.name,
            avatar: chat.avatar,
            lastMessage: chat.lastMessage,
            time: chat.time,
            unread: chat.unread,
            muted: chat.muted || false,
            other_user_id: chat.other_user_id || '',
            is_online: chat.is_online || false,
            last_active_timestamp: chat.last_active_timestamp || null,
            selected: false
            }));
          }
          return [];
        }),
      catchError((error) => {
        this.handleError(error);
        return of([]);
      })
      );
  }

  /**
   * Mendapatkan daftar chat untuk Satpam
   * @param timestamp - Timestamp untuk mencegah caching (opsional)
   */
  getSatpamChatList(timestamp?: number): Observable<Chat[]> {
    const url = timestamp 
      ? `${this.apiUrl}/api/satpam/chat/list?_=${timestamp}` 
      : `${this.apiUrl}/api/satpam/chat/list`;
    
    return this.http.post<any>(url, {}).pipe(
      map(response => {
        if (response && response.success && response.chats) {
          return response.chats.map((chat: any): Chat => ({
            id: chat.id,
            name: chat.name,
            avatar: chat.avatar,
            lastMessage: chat.lastMessage,
            time: chat.time,
            unread: chat.unread,
            muted: chat.muted || false,
            other_user_id: chat.other_user_id || '',
            is_online: chat.is_online || false,
            last_active_timestamp: chat.last_active_timestamp || null,
            selected: false
          }));
        }
        return [];
      }),
      catchError((error) => {
        this.handleError(error);
        return of([]);
      })
    );
  }

  /**
   * Mendapatkan detail chat - API yang diperbarui
   * @param chatId - ID chat
   */
  getChatDetail(chatId: string): Observable<{
    success: boolean;
    chat: {
      id: string;
      otherUser: any;
      messages: any[];
    };
  }> {
    const url = `${this.apiUrl}/api/warga/chat/detail`;
      
    return this.http.post<{
      success: boolean;
      chat: {
        id: string;
        otherUser: any;
        messages: any[];
      };
    }>(url, { chat_id: chatId }).pipe(
      catchError((error) => {
        this.handleError(error);
        return of({
          success: false,
          chat: {
            id: '',
            otherUser: {},
            messages: []
          }
        });
      })
    );
  }

  /**
   * Mendapatkan pesan baru untuk Warga
   * @param chatId - ID chat
   * @param lastMessageId - ID pesan terakhir
   * @param timestamp - Timestamp untuk mencegah caching (opsional)
   */
  getNewMessages(chatId: string, lastMessageId: string, timestamp?: number): Observable<any> {
    const url = timestamp 
      ? `${this.apiUrl}/api/warga/chat/new-messages?_=${timestamp}` 
      : `${this.apiUrl}/api/warga/chat/new-messages`;
    
    return this.http.post<any>(url, {
      chat_id: chatId,
      last_message_id: lastMessageId
    }).pipe(
      map(response => {
        if (response && response.success && response.messages) {
          // Format pesan-pesan baru agar URL gambar menggunakan storageUrl
          const formattedMessages = response.messages.map((msg: any) => {
            // Tangani URL gambar
            if (msg.image && !msg.image.startsWith('http')) {
              // Jika path sudah menggunakan format yang benar, jangan ubah
              if (msg.image.startsWith('/chat/') || msg.image.startsWith('chat/')) {
                msg.image = `${environment.apiUrl}/${msg.image}`;
              } else {
                // Untuk kompatibilitas dengan format lama
                msg.image = `${environment.storageUrl}/${msg.image.replace('/storage/', '')}`;
              }
            }
            
            // Tangani URL gambar di replyTo jika ada
            if (msg.replyTo && msg.replyTo.image && !msg.replyTo.image.startsWith('http')) {
              if (msg.replyTo.image.startsWith('/chat/') || msg.replyTo.image.startsWith('chat/')) {
                msg.replyTo.image = `${environment.apiUrl}/${msg.replyTo.image}`;
              } else {
                // Untuk kompatibilitas dengan format lama
                msg.replyTo.image = `${environment.storageUrl}/${msg.replyTo.image.replace('/storage/', '')}`;
              }
            }
            
            // Tangani URL dokumen jika ada
            if (msg.document && msg.document.url && !msg.document.url.startsWith('http')) {
              if (msg.document.url.startsWith('/chat/') || msg.document.url.startsWith('chat/')) {
                msg.document.url = `${environment.apiUrl}/${msg.document.url}`;
              } else {
                // Untuk kompatibilitas dengan format lama
                msg.document.url = `${environment.storageUrl}/${msg.document.url.replace('/storage/', '')}`;
              }
            }
            
            return msg;
          });
          
          // Format pesan untuk UI jika perlu
          return {
            success: true,
            messages: formattedMessages
          };
        }
        return {
          success: false,
          messages: []
        };
      }),
      catchError(error => {
        this.handleError(error);
        return of({
          success: false,
          messages: []
        });
      })
    );
  }

  /**
   * Mendapatkan detail chat untuk Warga
   * @param chatId - ID chat
   * @param timestamp - Timestamp untuk mencegah caching (opsional)
   */
  getChat(chatId: string, timestamp?: number): Observable<{
    chatId: string,
    otherUser: any,
    messages: Message[]
  }> {
    const url = timestamp 
      ? `${this.apiUrl}/api/warga/chat/detail?_=${timestamp}` 
      : `${this.apiUrl}/api/warga/chat/detail`;
      
    return this.http.post<any>(url, { chat_id: chatId }).pipe(
        map(response => {
        if (response && response.success && response.chat) {
          return {
            chatId: response.chat.id,
            otherUser: response.chat.otherUser,
            messages: this.formatMessages(response.chat.messages)
          };
        }
        return {
          chatId: '',
          otherUser: {},
          messages: []
        };
      }),
      catchError((error) => {
        this.handleError(error);
        return of({
          chatId: '',
          otherUser: {},
          messages: []
        });
      })
    );
            }
            
  /**
   * Mendapatkan detail chat untuk Satpam
   * @param chatId - ID chat
   * @param timestamp - Timestamp untuk mencegah caching (opsional)
   */
  getSatpamChat(chatId: string, timestamp?: number): Observable<{
    chatId: string,
    otherUser: any,
    messages: Message[]
  }> {
    const url = timestamp 
      ? `${this.apiUrl}/api/satpam/chat/detail?_=${timestamp}` 
      : `${this.apiUrl}/api/satpam/chat/detail`;
    
    return this.http.post<any>(url, { chat_id: chatId }).pipe(
      map(response => {
        if (response && response.success && response.chat) {
            return {
              chatId: response.chat.id,
              otherUser: response.chat.otherUser,
            messages: this.formatMessages(response.chat.messages)
          };
        }
        return {
          chatId: '',
          otherUser: {},
          messages: []
        };
        }),
      catchError((error) => {
        this.handleError(error);
        return of({
          chatId: '',
          otherUser: {},
          messages: []
        });
        })
      );
  }

  /**
   * Konversi file ke base64
   * @param file - File yang akan dikonversi
   */
  private fileToBase64(file: File): Observable<string> {
    return new Observable<string>(observer => {
      try {
        if (!(file instanceof Blob)) {
          console.error('Parameter bukan File/Blob:', typeof file);
          observer.error(new Error('Parameter bukan File/Blob'));
          return;
        }

        // Verifikasi ukuran file
        if (file.size < 100) {
          console.error('File terlalu kecil untuk menjadi dokumen valid:', file.size, 'bytes');
          observer.error(new Error('Ukuran file terlalu kecil: ' + file.size + ' bytes'));
          return;
        }

        console.log('Memulai konversi file ke base64:', { 
          name: file.name, 
          type: file.type, 
          size: file.size + ' bytes',
          sizeFormatted: this.formatFileSize(file.size) 
        });

        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Verifikasi hasil konversi
          if (!result || result.length < 100) {
            console.error('Hasil konversi base64 tidak valid atau terlalu kecil:', result?.length || 0, 'karakter');
            observer.error(new Error('Hasil konversi base64 tidak valid'));
            return;
          }
          
          console.log('Konversi ke base64 berhasil:', {
            resultLength: result.length + ' karakter',
            preview: result.substring(0, 50) + '...'
          });
          
          observer.next(result);
          observer.complete();
        };
        
        reader.onerror = (error) => {
          console.error('Error saat membaca file:', error);
          observer.error(error);
        };
        
        // Tambahkan timeout untuk file besar
        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentLoaded = Math.round((event.loaded / event.total) * 100);
            console.log(`Proses loading file: ${percentLoaded}%`);
          }
        };
        
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error in fileToBase64:', error);
        observer.error(error);
      }
    });
  }

  /**
   * Helper untuk mendapatkan ID numerik chat dari UUID
   * @param chatUUID - UUID dari chat
   * @param isSatpam - flag untuk menentukan apakah untuk Satpam atau Warga
   */
  private getChatNumericId(chatUUID: string, isSatpam: boolean = false): string | null {
    try {
      // Coba dapatkan dari localStorage dengan prefix yang sesuai
      const prefix = isSatpam ? 'satpam_' : 'warga_';
      const chatMapStr = localStorage.getItem(`${prefix}chat_id_map`);
      if (chatMapStr) {
        const chatMap = JSON.parse(chatMapStr);
        if (chatMap && chatMap[chatUUID]) {
          return chatMap[chatUUID];
        }
      }
      
      // Jika tidak ditemukan, coba ekstrak dari respons terakhir
      const lastChatDataStr = localStorage.getItem(`${prefix}chat_data_${chatUUID}`);
      if (lastChatDataStr) {
        const lastChatData = JSON.parse(lastChatDataStr);
        if (lastChatData && lastChatData.numericId) {
          // Simpan ke map untuk penggunaan berikutnya
          this.saveChatNumericId(chatUUID, lastChatData.numericId, isSatpam);
          return lastChatData.numericId;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting numeric chat ID:', error);
      return null;
    }
  }
  
  /**
   * Helper untuk menyimpan ID numerik chat
   * @param chatUUID - UUID dari chat
   * @param numericId - ID numerik yang akan disimpan
   * @param isSatpam - flag untuk menentukan apakah untuk Satpam atau Warga
   */
  private saveChatNumericId(chatUUID: string, numericId: string | null, isSatpam: boolean = false): void {
    try {
      if (!numericId) return; // Jangan simpan jika numericId null
      
      // Gunakan prefix untuk membedakan storage satpam dan warga
      const prefix = isSatpam ? 'satpam_' : 'warga_';
      
      // Dapatkan map yang ada atau buat baru
      const chatMapStr = localStorage.getItem(`${prefix}chat_id_map`) || '{}';
      const chatMap = JSON.parse(chatMapStr);
      
      // Tambahkan atau update mapping
      chatMap[chatUUID] = numericId;
      
      // Simpan kembali ke localStorage
      localStorage.setItem(`${prefix}chat_id_map`, JSON.stringify(chatMap));
    } catch (error) {
      console.error('Error saving numeric chat ID:', error);
    }
  }

  /**
   * Mengirim pesan untuk Warga
   * @param chatId - ID chat
   * @param message - Teks pesan
   * @param replyTo - ID pesan yang dibalas (opsional)
   * @param image - File gambar (opsional)
   * @param document - File dokumen (opsional)
   */
  sendMessage(
    chatId: string, 
    message: string, 
    replyTo?: string, 
    image?: File, 
    document?: File
  ): Observable<any> {
    // Pastikan message selalu memiliki nilai, minimal spasi jika kosong
    const messageText = message?.trim() ? message : " ";
    console.log('Sending warga message:', { 
      chatId, 
      message: messageText, 
      replyTo, 
      hasImage: !!image, 
      hasDocument: !!document,
      documentSize: document ? document.size : 0
    });

    // Cek validasi file dokumen
    if (document && document.size < 100) {
      console.warn('Dokumen terlalu kecil, ukuran:', document.size, 'bytes');
      console.log('Mencoba membuat placeholder dokumen yang lebih besar');
      
      try {
        // Buat dokumen placeholder yang lebih besar
        const dummyContent = 'X'.repeat(1000); // 1KB of data
        document = new File([dummyContent], document.name, { type: document.type });
      } catch (error) {
        console.error('Error creating placeholder document:', error);
      }
    }

    // Cek apakah chatId menggunakan format UUID (chat_id) atau numerik (id)
    let numericChatId = chatId;
    if (chatId.includes('-')) {
      // Ini adalah UUID, coba dapatkan ID numerik
      const cachedNumericId = this.getChatNumericId(chatId, false); // false = warga
      if (cachedNumericId) {
        numericChatId = cachedNumericId;
        console.log('Menggunakan ID numerik dari cache untuk sendMessage (warga):', numericChatId);
      } else {
        console.log('ID numerik tidak ditemukan di cache, menggunakan UUID untuk sendMessage (warga)');
      }
    }

    // URL endpoint untuk warga
    const endpoint = `${this.apiUrl}/api/warga/chat/send`;
          
    // Handle image upload dengan FormData
    if (image && image.size > 0) {
      console.log('Uploading warga image with FormData:', { 
        name: image.name, 
        type: image.type, 
        size: this.formatFileSize(image.size) 
      });
      
      const formData = new FormData();
          formData.append('chat_id', numericChatId);
    formData.append('message', messageText);
      formData.append('image', image);
    
    if (replyTo) {
      formData.append('reply_to', replyTo);
    }
    
      return this.http.post<any>(endpoint, formData)
        .pipe(
          catchError((error) => {
            console.error('Error sending warga image with FormData:', error);
            
            // Fallback ke metode base64
            return this.fileToBase64(image).pipe(
              switchMap(base64Image => {
                return this.http.post<any>(endpoint, { 
                  chat_id: numericChatId, 
                  message: messageText,
                  image: base64Image,
                  reply_to: replyTo || null
                });
              }),
              catchError(this.handleError)
            );
          })
        );
    }
    
    // Handle document upload dengan FormData
    if (document && document.size > 0) {
      console.log('Uploading warga document with FormData:', { 
        name: document.name, 
        type: document.type, 
        size: this.formatFileSize(document.size) 
      });
      
      const formData = new FormData();
      formData.append('chat_id', numericChatId);
      formData.append('message', messageText);
      formData.append('document', document);
    
      if (replyTo) {
        formData.append('reply_to', replyTo);
    }
    
      return this.http.post<any>(endpoint, formData)
      .pipe(
        catchError((error) => {
            console.error('Error sending warga document with FormData:', error);
          
            // Fallback ke metode base64
            return this.fileToBase64(document).pipe(
              switchMap(base64Document => {
                return this.http.post<any>(endpoint, { 
                  chat_id: numericChatId, 
                  message: messageText,
                  document: base64Document,
                  document_name: document.name,
                  document_type: document.type,
                  document_size: this.formatFileSize(document.size),
                  reply_to: replyTo || null
                });
              }),
              catchError(this.handleError)
            );
          })
        );
    }
    
    // Text message only
    return this.http.post<any>(endpoint, { 
      chat_id: numericChatId, 
      message: messageText,
      reply_to: replyTo || null
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mengirim pesan untuk Satpam
   * @param chatId - ID chat
   * @param message - Teks pesan
   * @param replyTo - ID pesan yang dibalas (opsional)
   * @param image - File gambar (opsional)
   * @param document - File dokumen (opsional)
   */
  sendSatpamMessage(
    chatId: string, 
    message: string, 
    replyTo?: string, 
    image?: File, 
    document?: File
  ): Observable<any> {
    // Pastikan message selalu memiliki nilai, minimal spasi jika kosong
    const messageText = message?.trim() ? message : " ";
    console.log('Sending satpam message:', { 
      chatId, 
      message: messageText, 
      replyTo, 
      hasImage: !!image, 
      hasDocument: !!document,
      documentSize: document ? document.size : 0
    });

    // Cek validasi file dokumen
    if (document && document.size < 100) {
      console.warn('Dokumen terlalu kecil, ukuran:', document.size, 'bytes');
      console.log('Mencoba membuat placeholder dokumen yang lebih besar');
      
      try {
        // Buat dokumen placeholder yang lebih besar
        const dummyContent = 'X'.repeat(1000); // 1KB of data
        document = new File([dummyContent], document.name, { type: document.type });
      } catch (error) {
        console.error('Error creating placeholder document:', error);
      }
    }

    // Cek apakah chatId menggunakan format UUID (chat_id) atau numerik (id)
    let numericChatId = chatId;
    if (chatId.includes('-')) {
      // Ini adalah UUID, coba dapatkan ID numerik
      const cachedNumericId = this.getChatNumericId(chatId, true); // true = satpam
      if (cachedNumericId) {
        numericChatId = cachedNumericId;
        console.log('Menggunakan ID numerik dari cache untuk sendSatpamMessage:', numericChatId);
      } else {
        console.log('ID numerik tidak ditemukan di cache, menggunakan UUID untuk sendSatpamMessage');
      }
    }

    // URL endpoint untuk satpam
    const endpoint = `${this.apiUrl}/api/satpam/chat/send`;

    // Handle image upload
    if (image && image.size > 0) {
      console.log('Uploading satpam image with FormData:', { 
        name: image.name, 
        type: image.type, 
        size: this.formatFileSize(image.size) 
      });
      
      const formData = new FormData();
      formData.append('chat_id', numericChatId);
      formData.append('message', messageText);
      formData.append('image', image);
      
      if (replyTo) {
        formData.append('reply_to', replyTo);
            }
            
      return this.http.post<any>(endpoint, formData)
              .pipe(
          catchError((error) => {
            console.error('Error sending satpam image with FormData:', error);
            
            // Fallback ke metode base64
            return this.fileToBase64(image).pipe(
              switchMap(base64Image => {
                return this.http.post<any>(endpoint, { 
                  chat_id: numericChatId, 
                  message: messageText,
                  image: base64Image,
                  reply_to: replyTo || null
                });
              }),
              catchError(this.handleError)
            );
                })
              );
          }
          
    // Handle document upload
    if (document && document.size > 0) {
      console.log('Uploading satpam document with FormData:', { 
        name: document.name, 
        type: document.type, 
        size: this.formatFileSize(document.size) 
      });
      
      const formData = new FormData();
      formData.append('chat_id', numericChatId);
      formData.append('message', messageText);
      formData.append('document', document);
      
      if (replyTo) {
        formData.append('reply_to', replyTo);
      }
      
      return this.http.post<any>(endpoint, formData)
        .pipe(
          catchError((error) => {
            console.error('Error sending satpam document with FormData:', error);
            
            // Fallback ke metode base64
            return this.fileToBase64(document).pipe(
              switchMap(base64Document => {
                return this.http.post<any>(endpoint, { 
                  chat_id: numericChatId, 
                  message: messageText,
                  document: base64Document,
                  document_name: document.name,
                  document_type: document.type,
                  document_size: this.formatFileSize(document.size),
                  reply_to: replyTo || null
                });
              }),
              catchError(this.handleError)
            );
        })
      );
    }

    // Text message only
    return this.http.post<any>(endpoint, { 
      chat_id: numericChatId, 
      message: messageText,
      reply_to: replyTo || null
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Format pesan dari API response ke format Message untuk UI
   * @param messages - Pesan dari API
   */
  private formatMessages(messages: any[]): Message[] {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }
    
    return messages.map((message: any): Message => {
      // Tangani URL gambar agar menggunakan storageUrl dari environment
      if (message.image && !message.image.startsWith('http')) {
        // Jika path sudah menggunakan format yang benar, jangan ubah
        if (message.image.startsWith('/chat/') || message.image.startsWith('chat/')) {
          message.image = `${environment.apiUrl}/${message.image}`;
        } else {
          // Untuk kompatibilitas dengan format lama
          message.image = `${environment.storageUrl}/${message.image.replace('/storage/', '')}`;
        }
      }
      
      // Proses URL gambar di replyTo jika ada
      if (message.replyTo && message.replyTo.image && !message.replyTo.image.startsWith('http')) {
        if (message.replyTo.image.startsWith('/chat/') || message.replyTo.image.startsWith('chat/')) {
          message.replyTo.image = `${environment.apiUrl}/${message.replyTo.image}`;
        } else {
          // Untuk kompatibilitas dengan format lama
          message.replyTo.image = `${environment.storageUrl}/${message.replyTo.image.replace('/storage/', '')}`;
        }
      }
      
      // Proses URL dokumen jika ada
      if (message.document && message.document.url && !message.document.url.startsWith('http')) {
        if (message.document.url.startsWith('/chat/') || message.document.url.startsWith('chat/')) {
          message.document.url = `${environment.apiUrl}/${message.document.url}`;
        } else {
          // Untuk kompatibilitas dengan format lama
          message.document.url = `${environment.storageUrl}/${message.document.url.replace('/storage/', '')}`;
        }
      }
      
      return {
        id: message.id,
        text: message.text || '',
        time: message.time,
        sender: message.sender,
        read: message.read,
        created_at: message.created_at || new Date().toISOString(),
        image: message.image,
        document: message.document,
        replyTo: message.replyTo,
        selected: false
      };
    });
  }

  /**
   * Menandai pesan sebagai sudah dibaca untuk Warga
   * @param chatId - ID chat
   */
  markAsRead(chatId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/warga/chat/mark-read`, { 
      chat_id: chatId 
    }).pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Menandai pesan sebagai sudah dibaca untuk Satpam
   * @param chatId - ID chat
   */
  markSatpamAsRead(chatId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/satpam/chat/mark-read`, { 
      chat_id: chatId 
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Menghapus pesan untuk Warga
   * @param messageId - ID pesan
   */
  deleteMessage(messageId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/warga/chat/delete-message`, { 
      message_id: messageId 
    }).pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Menghapus pesan untuk Satpam
   * @param messageId - ID pesan
   */
  deleteSatpamMessage(messageId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/satpam/chat/delete-message`, { 
      message_id: messageId 
    }).pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Menghapus chat untuk Warga dan Satpam
   * @param chatId - ID chat
   */
  deleteChat(chatId: string): Observable<any> {
    // Gunakan endpoint warga untuk sekarang (keduanya bisa menggunakan endpoint yang sama)
    return this.http.post<any>(`${this.apiUrl}/api/warga/chat/delete-chat`, { 
      chat_id: chatId 
    }).pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Menghapus semua pesan dalam chat (untuk Warga)
   * @param chatId - ID chat
   */
  clearChat(chatId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/warga/chat/clear-chat`, { 
      chat_id: chatId 
    }).pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Mendapatkan daftar pengguna yang tersedia untuk memulai chat baru (Warga)
   */
  getAvailableUsers(): Observable<any[]> {
    return this.http.post<any>(`${this.apiUrl}/api/warga/chat/contacts`, {}).pipe(
        map(response => {
        if (response && response.success && response.contacts) {
          return response.contacts;
          }
          return [];
        }),
      catchError(error => {
        this.handleError(error);
        return of([]);
      })
      );
  }

  /**
   * Mendapatkan daftar pengguna yang tersedia untuk memulai chat baru (Satpam)
   */
  getSatpamAvailableUsers(): Observable<any[]> {
    return this.http.post<any>(`${this.apiUrl}/api/satpam/chat/contacts`, {}).pipe(
        map(response => {
        if (response && response.success && response.contacts) {
          return response.contacts;
        }
        return [];
        }),
        catchError(error => {
        this.handleError(error);
        return of([]);
        })
      );
  }

  /**
   * Membuat chat baru
   * @param userId - ID user yang akan diajak chat
   */
  createChat(userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/warga/chat/create`, { 
      user_id: userId 
    }).pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Membuat chat baru untuk Satpam
   * @param userId - ID user yang akan diajak chat
   */
  createSatpamChat(userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/satpam/chat/create`, { 
      user_id: userId 
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mendapatkan status user
   * @param userId - ID user
   */
  getUserStatus(userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/warga/chat/user-status`, { 
      user_id: userId 
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Download dokumen dari pesan
   * @param messageId - ID pesan dengan dokumen
   */
  downloadDocument(messageId: string | number): string {
    return `${this.apiUrl}/api/warga/chat/download-document/${messageId}`;
  }

  /**
   * Download dokumen dari pesan satpam
   * @param messageId - ID pesan dengan dokumen
   */
  downloadSatpamDocument(messageId: string | number): string {
    return `${this.apiUrl}/api/satpam/chat/download-document/${messageId}`;
  }

  /**
   * Download dan simpan dokumen
   * @param messageId - ID pesan dengan dokumen
   */
  downloadAndSaveDocument(messageId: string | number): Promise<any> {
    const url = this.downloadDocument(messageId);
      
    return new Promise((resolve, reject) => {
      // Buat link download
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = `document_${messageId}`;
      
      // Simulasi klik pada link
      document.body.appendChild(a);
      a.click();
      
      // Bersihkan DOM
      setTimeout(() => {
        document.body.removeChild(a);
        resolve(true);
      }, 100);
    });
  }

  /**
   * Format file size untuk tampilan yang lebih user-friendly
   * @param bytes - Ukuran file dalam bytes
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Handle API errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('API Error:', error);
    
    // Custom error message based on status code
    let errorMessage = 'Terjadi kesalahan. Silakan coba lagi nanti.';
    
    if (error.status === 0) {
      // A client-side or network error occurred
      errorMessage = 'Koneksi terputus. Periksa koneksi internet Anda.';
      console.error('Network error:', error.error);
    } else if (error.status === 404) {
      // API endpoint not found
      errorMessage = 'Data yang Anda cari tidak ditemukan.';
      console.error('API endpoint not found:', error.url);
    } else if (error.status === 401) {
      // Unauthorized
      errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
      console.error('Unauthorized access:', error.error);
    } else if (error.status === 403) {
      // Forbidden
      errorMessage = 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
      console.error('Forbidden access:', error.error);
    } else if (error.status === 400) {
      // Bad request
      errorMessage = 'Permintaan tidak valid.';
      console.error('Bad request:', error.error);
    } else if (error.status === 500) {
      // Server error
      errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
      console.error('Server error:', error.error);
    }
    
    // Log additional info if available
    if (error.error && error.error.message) {
      console.error('Server message:', error.error.message);
      // Use server message if available
      errorMessage = error.error.message;
    }
    
    // Return an observable with a user-facing error message
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Mendapatkan pesan baru untuk Satpam setelah pesan terakhir
   * @param chatId - ID chat
   * @param lastMessageId - ID pesan terakhir
   * @param timestamp - Timestamp untuk mencegah caching (opsional)
   */
  getSatpamNewMessages(chatId: string, lastMessageId: string, timestamp?: number): Observable<any> {
    // Cache optimization - jika ini adalah request yang sama dengan sebelumnya, 
    // kita bisa mengabaikannya untuk mengurangi beban server
    const cacheKey = `last_check_${chatId}_${lastMessageId}`;
    const now = new Date().getTime();
    const lastCheck = parseInt(sessionStorage.getItem(cacheKey) || '0');
    
    // Pastikan jeda minimal 1 detik antara request ke server yang sama
    if (lastCheck && (now - lastCheck) < 1000) {
      console.log('Throttling duplicate request to server');
      return of({
        success: false,
        messages: []
      });
    }
    
    // Update timestamp terakhir check
    sessionStorage.setItem(cacheKey, now.toString());
    
    // Cek apakah chatId menggunakan format UUID (chat_id) atau numerik (id)
    let numericChatId = chatId;
    if (chatId.includes('-')) {
      // Ini adalah UUID, coba dapatkan ID numerik
      const cachedNumericId = this.getChatNumericId(chatId, true); // true = satpam
      if (cachedNumericId) {
        numericChatId = cachedNumericId;
        console.log('Menggunakan ID numerik dari cache untuk getSatpamNewMessages:', numericChatId);
      } else {
        console.log('ID numerik tidak ditemukan di cache, menggunakan UUID untuk getSatpamNewMessages');
      }
    }
    
    // Tambahkan timestamp untuk mencegah caching
    const url = timestamp 
      ? `${this.apiUrl}/api/satpam/chat/new-messages?_=${timestamp}` 
      : `${this.apiUrl}/api/satpam/chat/new-messages`;
    
    return this.http.post<any>(url, {
      chat_id: numericChatId,
      last_message_id: lastMessageId
    }).pipe(
      map(response => {
        if (response && response.success && response.messages) {
          // Format pesan-pesan baru agar URL gambar menggunakan storageUrl
          const formattedMessages = response.messages.map((msg: any) => {
            // Tangani URL gambar
            if (msg.image && !msg.image.startsWith('http')) {
              // Jika path sudah menggunakan format yang benar, jangan ubah
              if (msg.image.startsWith('/chat/') || msg.image.startsWith('chat/')) {
                msg.image = `${environment.apiUrl}/${msg.image}`;
              } else {
                // Untuk kompatibilitas dengan format lama
                msg.image = `${environment.storageUrl}/${msg.image.replace('/storage/', '')}`;
              }
            }
            
            // Tangani URL gambar di replyTo jika ada
            if (msg.replyTo && msg.replyTo.image && !msg.replyTo.image.startsWith('http')) {
              if (msg.replyTo.image.startsWith('/chat/') || msg.replyTo.image.startsWith('chat/')) {
                msg.replyTo.image = `${environment.apiUrl}/${msg.replyTo.image}`;
              } else {
                // Untuk kompatibilitas dengan format lama
                msg.replyTo.image = `${environment.storageUrl}/${msg.replyTo.image.replace('/storage/', '')}`;
              }
            }
            
            // Tangani URL dokumen jika ada
            if (msg.document && msg.document.url && !msg.document.url.startsWith('http')) {
              if (msg.document.url.startsWith('/chat/') || msg.document.url.startsWith('chat/')) {
                msg.document.url = `${environment.apiUrl}/${msg.document.url}`;
              } else {
                // Untuk kompatibilitas dengan format lama
                msg.document.url = `${environment.storageUrl}/${msg.document.url.replace('/storage/', '')}`;
              }
            }
            
            return msg;
          });
          
          return {
            success: true,
            messages: formattedMessages
          };
        }
        return {
          success: false,
          messages: []
        };
      }),
      catchError(error => {
        console.error('Error getting new messages for satpam:', error);
        this.handleError(error);
        return of({
          success: false,
          messages: []
        });
      })
    );
  }
} 