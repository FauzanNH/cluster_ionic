import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PhoneModalComponent } from './phone-modal/phone-modal.component';
import { EmailModalComponent } from './email-modal/email-modal.component';
import { PasswordModalComponent } from './password-modal/password-modal.component';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-keamanan',
  templateUrl: './keamanan.page.html',
  styleUrls: ['./keamanan.page.scss'],
  standalone: false,
})
export class KeamananPage implements OnInit {
  securityNotifications = true;
  
  // Properti untuk card progress keamanan
  isPinEnabled: boolean = false;
  isFingerprintEnabled: boolean = false;
  totalProgress: number = 0;

  constructor(
    private modalController: ModalController,
    private http: HttpClient
  ) {}

  ngOnInit() {}

  ionViewWillEnter() {
    this.checkSecurityStatus();
  }

  // Metode untuk memeriksa status keamanan
  private checkSecurityStatus() {
    // Reset progress di awal
    this.totalProgress = 0;
    this.isPinEnabled = false;
    this.isFingerprintEnabled = false;
    
    // Ambil users_id dari localStorage
    const userStr = localStorage.getItem('user');
    let users_id = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        users_id = user.users_id || user.id || '';
      } catch (e) {}
    }

    if (!users_id) {
      return;
    }

    // Periksa status PIN
    this.http.post<any>(`${environment.apiUrl}/api/satpam/keamanan/get-pin-security`, { users_id }).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.isPinEnabled = res.pin_security_enabled || false;
        }
        
        // Periksa status sidik jari
        this.checkFingerprintStatus();
        
        // Hitung total progress setelah kedua status diperiksa
        this.calculateTotalProgress();
      },
      error: (err) => {
        console.error('Error checking PIN status:', err);
        this.isPinEnabled = false;
        
        // Periksa status sidik jari
        this.checkFingerprintStatus();
        
        // Hitung total progress setelah kedua status diperiksa
        this.calculateTotalProgress();
      }
    });
  }

  // Periksa status sidik jari dari localStorage
  private checkFingerprintStatus() {
    const securitySettings = localStorage.getItem('security');
    if (securitySettings) {
      try {
        const settings = JSON.parse(securitySettings);
        this.isFingerprintEnabled = settings === 'fingerprint_is_active';
      } catch (e) {
        console.error('Error parsing security settings:', e);
        this.isFingerprintEnabled = false;
      }
    } else {
      this.isFingerprintEnabled = false;
    }
  }
  
  // Hitung total progress berdasarkan status PIN dan sidik jari
  private calculateTotalProgress() {
    // Reset progress
    this.totalProgress = 0;
    
    // Jika PIN aktif, tambahkan 50%
    if (this.isPinEnabled) {
      this.totalProgress += 50;
    }
    
    // Jika sidik jari aktif, tambahkan 50%
    if (this.isFingerprintEnabled) {
      this.totalProgress += 50;
    }
    
    console.log('Security Progress (Keamanan Satpam Page):', {
      pin: this.isPinEnabled ? 'Aktif' : 'Tidak Aktif',
      fingerprint: this.isFingerprintEnabled ? 'Aktif' : 'Tidak Aktif',
      total: this.totalProgress + '%'
    });
  }

  selectSecurityOption(option: string) {
    console.log('Selected option:', option);
  }

  async openPhoneModal() {
    const modal = await this.modalController.create({
      component: PhoneModalComponent,
      cssClass: 'modern-phone-modal compact-modal light-theme-modal',
      backdropDismiss: true,
      showBackdrop: true,
      animated: true,
      breakpoints: [0, 0.5, 0.8],
      initialBreakpoint: 0.5
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      console.log('Phone number updated:', data);
      // Handle the updated phone number data if needed
    }
  }

  async openEmailModal() {
    const modal = await this.modalController.create({
      component: EmailModalComponent,
      cssClass: 'modern-email-modal compact-modal light-theme-modal',
      backdropDismiss: true,
      showBackdrop: true,
      animated: true,
      breakpoints: [0, 0.5, 0.8],
      initialBreakpoint: 0.5
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      console.log('Email updated:', data);
      // Handle the updated email data if needed
    }
  }
  
  async openPasswordModal() {
    const modal = await this.modalController.create({
      component: PasswordModalComponent,
      cssClass: 'modern-password-modal light-theme-modal',
      backdropDismiss: true,
      showBackdrop: true,
      animated: true,
      breakpoints: [0, 0.7, 0.9],
      initialBreakpoint: 0.7
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      console.log('Password updated:', data);
      // Handle the updated password data if needed
    }
  }
}
