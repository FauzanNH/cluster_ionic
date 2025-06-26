import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AlertController, LoadingController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { register } from 'swiper/element/bundle';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, AfterViewInit {
  @ViewChild('swiper') swiperRef: ElementRef | undefined;
  showContent = false;
  loadingMessage = 'Memuat koneksi ke server';
  slideOpts = {
    initialSlide: 0,
    speed: 400,
    autoplay: {
      delay: 4000,
      disableOnInteraction: false
    },
    pagination: {
      clickable: true
    },
    effect: 'fade',
    fadeEffect: {
      crossFade: true
    }
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {
    // Register Swiper web component
    register();
  }

  ngAfterViewInit() {
    // Initialize Swiper if content is shown
    if (this.showContent) {
      this.initializeSwiper();
    }
  }

  async ngOnInit() {
    let timeoutHandle: any;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('timeout')), 7000);
    });

    try {
      await Promise.race([
        this.http.get(environment.apiUrl + '/api/ping').toPromise(),
        timeoutPromise
      ]);
      clearTimeout(timeoutHandle);
      
      // Update pesan loading
      this.loadingMessage = 'Memuat akun...';

      // Cek apakah ada data tamu di localStorage
      const tamuData = localStorage.getItem('tamu_data');
      if (tamuData) {
        try {
          // Update pesan loading sebelum redirect
          this.loadingMessage = 'Menyiapkan halaman tamu...';
          await this.delay(800);
          // Redirect ke dashboard tamu jika data tamu ada
          // Gunakan navigateByUrl untuk memastikan navigasi langsung tanpa riwayat
          this.router.navigateByUrl('/tamu/dashboard', { replaceUrl: true });
          return;
        } catch (e) {
          console.error('Error redirecting to tamu dashboard:', e);
          // Jika gagal, hapus data tamu yang mungkin rusak
          localStorage.removeItem('tamu_data');
        }
      }

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        // Tunggu sebentar untuk menampilkan animasi loading
        await this.delay(1000);
        this.showContent = true; 
        this.initializeSwiper();
        return;
      }
      let user: any = {};
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        user = {};
      }

      // Cek ke server apakah akun masih terdaftar
      try {
        // Update pesan loading
        this.loadingMessage = 'Memeriksa akun...';
        
        const cekRes: any = await this.http.post(environment.apiUrl + '/api/cek-akun', { users_id: user.users_id }).toPromise();
        if (!cekRes.success) {
          const alert = await this.alertController.create({
            header: 'Akun Tidak Aktif',
            message: 'Akun telah dihapus atau ditangguhkan.',
            buttons: ['OK']
          });
          await alert.present();
          localStorage.removeItem('user');
          
          // Tunggu sebentar untuk menampilkan animasi loading
          await this.delay(1000);
          this.showContent = true;
          this.initializeSwiper();
          return;
        }
      } catch (e) {
        const alert = await this.alertController.create({
          header: 'Akun Tidak Aktif',
          message: 'Akun telah dihapus atau ditangguhkan.',
          buttons: ['OK']
        });
        await alert.present();
        localStorage.removeItem('user');
        
        // Tunggu sebentar untuk menampilkan animasi loading
        await this.delay(1000);
        this.showContent = true;
        this.initializeSwiper();
        return;
      }

      // Update pesan loading sebelum redirect
      this.loadingMessage = 'Menyiapkan halaman...';
      await this.delay(800);
      
      if (user && user.role) {
        if (user.role === 'Warga') {
          this.router.navigateByUrl('/warga/beranda', { replaceUrl: true });
        } else if (user.role === 'Satpam') {
          this.router.navigateByUrl('/satpam/beranda', { replaceUrl: true });
        } else {
          this.showContent = true;
          this.initializeSwiper();
        }
      } else {
        this.showContent = true;
        this.initializeSwiper();
      }
    } catch (err) {
      clearTimeout(timeoutHandle);
      
      this.loadingMessage = 'Gagal terhubung ke server...';
      await this.delay(1000);
      
      this.showContent = false;
      const alert = await this.alertController.create({
        header: 'Koneksi Gagal',
        message: 'Tidak dapat terhubung ke server. Silakan cek koneksi internet Anda atau coba lagi nanti.',
        buttons: [{
          text: 'OK',
          handler: () => {
            App.exitApp();
          }
        }]
      });
      await alert.present();
    }
  }

  // Helper method untuk delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Navigation methods
  slideNext() {
    const swiperEl = document.querySelector('swiper-container');
    if (swiperEl) {
      // @ts-ignore
      swiperEl.swiper.slideNext();
    }
  }

  slidePrev() {
    const swiperEl = document.querySelector('swiper-container');
    if (swiperEl) {
      // @ts-ignore
      swiperEl.swiper.slidePrev();
    }
  }

  // Helper method to initialize swiper
  private initializeSwiper() {
    setTimeout(() => {
      const swiperEl = document.querySelector('swiper-container');
      if (swiperEl) {
        Object.assign(swiperEl, this.slideOpts);
        // @ts-ignore
        swiperEl.initialize();
      }
    }, 300);
  }
}
