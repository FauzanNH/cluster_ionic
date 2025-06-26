import { Component, OnInit } from '@angular/core';
import { ModalController, LoadingController, ToastController, NavController, IonicModule } from '@ionic/angular';
import { ChatService } from '../../../services/chat.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact-search-modal',
  templateUrl: './contact-search-modal.component.html',
  styleUrls: ['./contact-search-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class ContactSearchModalComponent implements OnInit {
  contacts: any[] = [];
  filteredContacts: any[] = [];
  searchQuery: string = '';
  isLoading: boolean = true;
  loadingError: string = '';

  constructor(
    private modalCtrl: ModalController,
    private chatService: ChatService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.loadContacts();
  }

  loadContacts() {
    this.isLoading = true;
    this.loadingError = '';
    
    this.chatService.getSatpamAvailableUsers().subscribe(
      (users) => {
        console.log('Received contacts from API:', users);
        if (users.length > 0) {
          console.log('Sample contact object structure:', users[0]);
        }
        
        this.contacts = users;
        this.filteredContacts = [...users];
        this.isLoading = false;
      },
      (error) => {
        console.error('Error loading contacts:', error);
        this.isLoading = false;
        this.loadingError = error.message || 'Gagal memuat daftar kontak';
      }
    );
  }

  filterContacts() {
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      this.filteredContacts = [...this.contacts];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    
    this.filteredContacts = this.contacts.filter(contact => 
      contact.name.toLowerCase().includes(query) || 
      contact.role.toLowerCase().includes(query) ||
      (contact.email && contact.email.toLowerCase().includes(query)) ||
      ((contact.id || contact.users_id) && 
       (contact.id?.toLowerCase().includes(query) || contact.users_id?.toLowerCase().includes(query)))
    );
  }

  async startChat(userId: string) {
    console.log('Starting chat with user ID:', userId);
    if (!userId) {
      console.error('User ID is empty or undefined');
      return;
    }
    
    try {
      const loading = await this.loadingCtrl.create({
        message: 'Memulai percakapan...',
        spinner: 'circular'
      });
      
      await loading.present();
      
      this.chatService.createSatpamChat(userId).subscribe(
        async (response) => {
          console.log('Create chat response:', response);
          await loading.dismiss();
          
          // Periksa berbagai kemungkinan struktur respons
          let chatId;
          if (response && response.success) {
            // Coba mendapatkan chat_id dari berbagai kemungkinan lokasi
            chatId = response.chat_id || response.id || response.chatId;
            
            if (response.data && typeof response.data === 'object') {
              chatId = chatId || response.data.chat_id || response.data.id || response.data.chatId;
            }
            
            console.log('Extracted chat ID:', chatId);
            
            if (chatId) {
              // Dismiss modal with the chat ID as data
              this.modalCtrl.dismiss({
                chatId: chatId
              }, 'success');
            } else {
              console.error('Chat ID tidak ditemukan dalam respons:', response);
              this.presentToast('Percakapan dibuat tapi ID tidak ditemukan');
            }
          } else {
            console.error('Failed to create chat:', response);
            this.presentToast('Gagal memulai percakapan: ' + (response?.message || 'Terjadi kesalahan'));
          }
        },
        async (error) => {
          console.error('Create chat error:', error);
          await loading.dismiss();
          this.presentToast('Gagal memulai percakapan: ' + (error.message || 'Terjadi kesalahan'));
        }
      );
    } catch (err) {
      console.error('Unexpected error in startChat:', err);
      this.presentToast('Terjadi kesalahan tak terduga. Coba lagi nanti.');
    }
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  getRoleBadge(role: string | undefined): string {
    // Jika role undefined atau null, kembalikan 'medium'
    if (!role) {
      return 'medium';
    }
    
    const roleLower = role.toLowerCase();
    
    if (roleLower === 'warga') {
      return 'success';
    } else if (roleLower === 'satpam') {
      return 'primary';
    } else if (roleLower === 'rt') {
      return 'warning';
    } else if (roleLower === 'developer') {
      return 'danger';
    }
    
    return 'medium';
  }

  onContactClick(contact: any) {
    console.log('Contact clicked:', contact);
    
    // Gunakan contact.id karena users_id tidak ada dalam objek kontak
    const userId = contact.id || contact.users_id;
    console.log('User ID yang akan digunakan:', userId);
    
    if (userId) {
      // Panggil metode startChat
      this.startChat(userId);
    } else {
      console.error('User ID tidak ditemukan dalam objek kontak:', contact);
      this.presentToast('Terjadi kesalahan: ID kontak tidak ditemukan');
    }
  }
} 