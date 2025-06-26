import { Component, OnInit } from '@angular/core';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { HttpClient } from '@angular/common/http';
import { LoadingController, ToastController, NavController, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { Storage } from '@ionic/storage-angular';

interface CalendarDay {
  day: string;
  date: Date | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  shift: string | null;
  jadwal?: any;
  hidden?: boolean;
  selected?: boolean;
}

@Component({
  selector: 'app-jadwalkerja',
  templateUrl: './jadwalkerja.page.html',
  styleUrls: ['./jadwalkerja.page.scss'],
  standalone: false,
})
export class JadwalkerjaPage implements OnInit {
  // Calendar related properties
  currentDate: Date = new Date();
  currentMonthYear: string = '';
  weekdays: string[] = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  calendarDays: CalendarDay[] = [];
  
  // Selected date and shift info
  selectedDate: CalendarDay | null = null;
  selectedDateFormatted: string = '';
  
  // User data
  userId: string = '';
  isLoading: boolean = false;
  isLoadingDetail: boolean = false;
  
  // Schedule data
  jadwalData: any[] = [];
  calendarData: any[] = [];
  
  constructor(
    private http: HttpClient,
    private toastCtrl: ToastController,
    private storage: Storage,
    private navCtrl: NavController,
    private alertCtrl: AlertController
  ) { }

  async ngOnInit() {
    await this.storage.create();
    const userDataLoaded = await this.getUserData();
    
    if (userDataLoaded) {
      await this.loadJadwalData();
      // Otomatis pilih tanggal hari ini setelah data jadwal dimuat
      setTimeout(() => {
        this.selectTodayDate();
      }, 500);
      
      // Set up interval to refresh user data and schedule periodically
      this.setupRefreshInterval();
    } else {
      // Jika data pengguna tidak ditemukan, tampilkan dialog
      await this.showUserIdInputDialog();
    }
  }
  
  // Set up interval to refresh data every 5 minutes
  setupRefreshInterval() {
    setInterval(async () => {
      console.log('Refreshing user data and schedule...');
      await this.getUserData();
      await this.loadJadwalData(false); // false means don't show loading indicator
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  async showUserIdInputDialog() {
    const alert = await this.alertCtrl.create({
      header: 'ID Pengguna Tidak Ditemukan',
      message: 'Masukkan ID pengguna Anda untuk melihat jadwal kerja',
      inputs: [
        {
          name: 'userId',
          type: 'text',
          placeholder: 'Masukkan ID pengguna'
        }
      ],
      buttons: [
        {
          text: 'Batal',
          role: 'cancel',
          handler: () => {
            this.navCtrl.navigateRoot('/login');
          }
        },
        {
          text: 'Simpan',
          handler: async (data) => {
            if (data.userId && data.userId.trim() !== '') {
              this.userId = data.userId.trim();
              
              // Simpan ke storage untuk penggunaan berikutnya
              const userData = { users_id: this.userId };
              await this.storage.set('userData', userData);
              localStorage.setItem('userData', JSON.stringify(userData));
              localStorage.setItem('user', JSON.stringify(userData)); // Save with key 'user' as well
              sessionStorage.setItem('userData', JSON.stringify(userData));
              
              this.presentToast('ID pengguna berhasil disimpan', 'success');
              this.loadJadwalData();
            } else {
              this.presentToast('ID pengguna tidak valid', 'danger');
              setTimeout(() => {
                this.showUserIdInputDialog();
              }, 1000);
            }
          }
        }
      ]
    });

    await alert.present();
  }
  
  async getUserData(): Promise<boolean> {
    try {
      // Always check localStorage first with key 'user' as priority
      const localUserData = localStorage.getItem('user');
      if (localUserData) {
        try {
          const userData = JSON.parse(localUserData);
          if (userData && userData.users_id) {
            console.log('Data pengguna ditemukan di localStorage dengan key "user"');
            this.userId = userData.users_id;
            
            // Update all storage locations to ensure consistency
            const standardUserData = { users_id: this.userId };
            await this.storage.set('userData', standardUserData);
            localStorage.setItem('userData', JSON.stringify(standardUserData));
            sessionStorage.setItem('userData', JSON.stringify(standardUserData));
            return true;
          }
        } catch (e) {
          console.error('Error parsing localStorage user data', e);
        }
      }
      
      // Try all other storage options
      // 1. Try from Ionic Storage
      const ionicUserData = await this.storage.get('userData');
      if (ionicUserData && ionicUserData.users_id) {
        console.log('Data pengguna ditemukan di Ionic Storage');
        this.userId = ionicUserData.users_id;
        
        // Update localStorage with key 'user'
        const standardUserData = { users_id: this.userId };
        localStorage.setItem('user', JSON.stringify(standardUserData));
        localStorage.setItem('userData', JSON.stringify(standardUserData));
        sessionStorage.setItem('userData', JSON.stringify(standardUserData));
        return true;
      }
      
      // 2. Try from localStorage with key 'userData'
      const localUserDataAlt = localStorage.getItem('userData');
      if (localUserDataAlt) {
        try {
          const userData = JSON.parse(localUserDataAlt);
          if (userData && userData.users_id) {
            console.log('Data pengguna ditemukan di localStorage dengan key "userData"');
            this.userId = userData.users_id;
            
            // Update localStorage with key 'user'
            const standardUserData = { users_id: this.userId };
            localStorage.setItem('user', JSON.stringify(standardUserData));
            await this.storage.set('userData', standardUserData);
            sessionStorage.setItem('userData', JSON.stringify(standardUserData));
            return true;
          }
        } catch (e) {
          console.error('Error parsing localStorage userData', e);
        }
      }
      
      // 3. Try from sessionStorage
      const sessionUserData = sessionStorage.getItem('userData');
      if (sessionUserData) {
        try {
          const userData = JSON.parse(sessionUserData);
          if (userData && userData.users_id) {
            console.log('Data pengguna ditemukan di sessionStorage');
            this.userId = userData.users_id;
            
            // Update all storage locations
            const standardUserData = { users_id: this.userId };
            await this.storage.set('userData', standardUserData);
            localStorage.setItem('userData', JSON.stringify(standardUserData));
            localStorage.setItem('user', JSON.stringify(standardUserData));
            return true;
          }
        } catch (e) {
          console.error('Error parsing sessionStorage userData', e);
        }
      }
      
      // 4. Try from localStorage with other possible keys
      const alternativeKeys = ['userInfo', 'satpamData', 'loginData', 'authUser'];
      for (const key of alternativeKeys) {
        const altData = localStorage.getItem(key);
        if (altData) {
          try {
            const userData = JSON.parse(altData);
            if (userData && (userData.users_id || userData.id)) {
              console.log(`Data pengguna ditemukan di localStorage dengan kunci: ${key}`);
              this.userId = userData.users_id || userData.id;
              
              // Simpan dengan format yang benar ke semua penyimpanan
              const standardUserData = { users_id: this.userId };
              await this.storage.set('userData', standardUserData);
              localStorage.setItem('userData', JSON.stringify(standardUserData));
              localStorage.setItem('user', JSON.stringify(standardUserData));
              sessionStorage.setItem('userData', JSON.stringify(standardUserData));
              return true;
            }
          } catch (e) {
            console.error(`Error parsing localStorage ${key}`, e);
          }
        }
      }
      
      // Tidak ada data pengguna yang ditemukan
      console.error('Data pengguna tidak ditemukan di semua penyimpanan');
      return false;
      
    } catch (error) {
      console.error('Error getting user data:', error);
      this.presentToast('Gagal mendapatkan data pengguna', 'danger');
      return false;
    }
  }

  // Save schedule data to cache
  saveDataToCache() {
    try {
      const cacheData = {
        month: this.currentDate.getMonth() + 1,
        year: this.currentDate.getFullYear(),
        jadwal: this.jadwalData,
        calendar: this.calendarData,
        bulan_label: this.currentMonthYear,
        timestamp: new Date().getTime()
      };
      
      localStorage.setItem('jadwalCache', JSON.stringify(cacheData));
      console.log('Data jadwal berhasil disimpan ke cache');
    } catch (error) {
      console.error('Error saving data to cache:', error);
    }
  }

  async loadJadwalData(showLoading = true) {
    // Always refresh user data before loading schedule
    if (!this.userId) {
      const userDataLoaded = await this.getUserData();
      if (!userDataLoaded) {
        this.presentToast('ID pengguna tidak ditemukan', 'danger');
        await this.showUserIdInputDialog();
        return;
      }
    }
    
    this.isLoading = true;
    
    const month = this.currentDate.getMonth() + 1; // JavaScript months are 0-based
    const year = this.currentDate.getFullYear();
    
    // Gunakan URL API yang benar dengan prefix /api/
    const apiUrl = `${environment.apiUrl}/api/satpam/jadwalkerja/bulan/${month}/${year}?users_id=${this.userId}`;
    
    console.log('Mencoba mengakses URL API:', apiUrl);
    
    // Tambahkan timeout untuk menghindari permintaan yang terlalu lama
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 detik timeout
    });
    
    // Buat permintaan dengan timeout
    try {
      const responsePromise = this.http.get(apiUrl, { 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }).toPromise();
      
      // Race antara response dan timeout
      const response: any = await Promise.race([responsePromise, timeoutPromise]);
      
      if (response && response.success) {
        console.log('Data jadwal berhasil dimuat:', response);
        this.jadwalData = response.data.jadwal;
        this.calendarData = response.data.calendar;
        this.currentMonthYear = response.data.bulan_label;
        
        // Save data to cache for offline use
        this.saveDataToCache();
        
        this.generateCalendarDays();
        
        // Pilih tanggal hari ini setelah data jadwal dimuat
        this.selectTodayDate();
        
        this.isLoading = false;
      } else {
        console.warn('Response tidak sukses atau format tidak sesuai:', response);
        this.handleLoadError();
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      this.handleLoadError();
    }
  }
  
  // Handle error loading schedule
  handleLoadError() {
    console.log('Menangani error loading, mencoba menggunakan cache');
    
    // Coba ambil data dari cache jika tersedia
    const cachedData = localStorage.getItem('jadwalCache');
    if (cachedData) {
      try {
        const parsedCache = JSON.parse(cachedData);
        const currentMonth = this.currentDate.getMonth() + 1;
        const currentYear = this.currentDate.getFullYear();
        
        // Cek apakah cache untuk bulan dan tahun yang sama
        if (parsedCache.month === currentMonth && parsedCache.year === currentYear) {
          console.log('Menggunakan data jadwal dari cache');
          this.jadwalData = parsedCache.jadwal;
          this.calendarData = parsedCache.calendar;
          this.currentMonthYear = parsedCache.bulan_label;
          this.generateCalendarDays();
          
          // Pilih tanggal hari ini setelah data jadwal dimuat
          this.selectTodayDate();
          
          this.isLoading = false;
          
          // Tampilkan toast bahwa menggunakan data cache
          this.presentToast('Menggunakan data jadwal tersimpan', 'warning');
          return;
        }
      } catch (e) {
        console.error('Error parsing cached data:', e);
      }
    }
    
    // Jika tidak ada cache yang valid, tampilkan pesan tidak ada jadwal
    this.presentToast('Tidak dapat memuat jadwal dari server', 'warning');
    
    // Buat calendar kosong tanpa jadwal
    this.jadwalData = [];
    this.calendarData = [];
    this.generateEmptyCalendar();
    
    // Pilih tanggal hari ini
    this.selectTodayDate();
    
    this.isLoading = false;
  }
  
  // Generate empty calendar without schedules
  generateEmptyCalendar() {
    const firstDay = startOfMonth(this.currentDate);
    const lastDay = endOfMonth(this.currentDate);
    
    const days = eachDayOfInterval({
      start: firstDay,
      end: lastDay
    });
    
    days.forEach((date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Add to calendarData without shifts
      this.calendarData.push({
        date: dateStr,
        day: format(date, 'd'),
        weekday: format(date, 'E', { locale: id }),
        shift: null,
        is_today: isToday(date)
      });
    });
    
    // Set month label
    this.currentMonthYear = format(this.currentDate, 'MMMM yyyy', { locale: id });
    
    // Generate calendar days
    this.generateCalendarDays();
  }

  // Generate calendar days based on API data
  generateCalendarDays() {
    const firstDayOfMonth = startOfMonth(this.currentDate);
    const lastDayOfMonth = endOfMonth(this.currentDate);
    
    // Create calendar grid with appropriate offset for first day of month
    this.calendarDays = [];
    
    // Add empty cells for days before the first day of month
    const firstDayOfWeek = getDay(firstDayOfMonth); // 0 = Sunday, 1 = Monday, etc.
    for (let i = 0; i < firstDayOfWeek; i++) {
      this.calendarDays.push({
        day: '',
        date: null,
        isCurrentMonth: false,
        isToday: false,
        shift: null
      });
    }
    
    // Add actual days of the month
    const daysInMonth = eachDayOfInterval({
      start: firstDayOfMonth,
      end: lastDayOfMonth
    });
    
    daysInMonth.forEach((date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const calendarDay = this.calendarData.find(d => d.date === dateStr);
      
      const shift = calendarDay ? calendarDay.shift : null;
      const jadwal = this.jadwalData.find(j => j.tanggal === dateStr);
      
      const isCurrentDay = isToday(date);
      
      this.calendarDays.push({
        day: format(date, 'd'),
        date: date,
        isCurrentMonth: true,
        isToday: isCurrentDay,
        shift: shift,
        jadwal: jadwal,
        // Pra-seleksi hari ini
        selected: isCurrentDay
      });
    });
    
    // If needed, add empty cells to complete the grid
    const remainingCells = 42 - this.calendarDays.length; // 6 rows of 7 days
    for (let i = 0; i < remainingCells; i++) {
      this.calendarDays.push({
        day: '',
        date: null,
        isCurrentMonth: false,
        isToday: false,
        shift: null
      });
    }
  }

  // Navigate to previous month
  async previousMonth() {
    this.currentDate = subMonths(this.currentDate, 1);
    this.selectedDate = null;
    await this.loadJadwalData();
  }

  // Navigate to next month
  async nextMonth() {
    this.currentDate = addMonths(this.currentDate, 1);
    this.selectedDate = null;
    await this.loadJadwalData();
  }

  // Generate dummy schedule data as fallback - REMOVED, NOT USED ANYMORE
  generateDummySchedule() {
    // Instead of generating dummy data, we'll create an empty calendar
    this.generateEmptyCalendar();
  }
  
  // Check if a day has a schedule
  hasSchedule(day: CalendarDay): boolean {
    if (!day.date) return false;
    
    const dateStr = format(day.date, 'yyyy-MM-dd');
    return this.jadwalData.some(j => j.tanggal === dateStr);
  }

  // Select a date to show details
  async selectDate(day: CalendarDay) {
    if (!day.date) return;
    // Hapus kelas 'selected' dari semua tanggal
    this.calendarDays.forEach(d => {
      if (d.date) {
        d.selected = false;
      }
    });
    // Tandai tanggal yang dipilih
    day.selected = true;
    if (day.jadwal) {
      this.selectedDate = day;
      if (day.date) {
        this.selectedDateFormatted = format(day.date, 'EEEE, d MMMM yyyy', { locale: id });
      }
    } else {
      // If no schedule exists for this day, load it from API
      if (!day.date) return;
      const dateStr = format(day.date, 'yyyy-MM-dd');
      this.isLoadingDetail = true;
      // Ensure we have the latest user ID
      await this.getUserData();
      // Gunakan URL API yang benar dengan prefix /api/
      const apiUrl = `${environment.apiUrl}/api/satpam/jadwalkerja/hari/${dateStr}?users_id=${this.userId}`;
      console.log('Mencoba mengakses detail jadwal:', apiUrl);
      this.http.get(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              console.log('Detail jadwal berhasil dimuat:', response);
              day.jadwal = response.data;
              this.selectedDate = day;
              this.selectedDateFormatted = response.data.tanggal_lengkap;
            } else {
              console.log('Tidak ada jadwal untuk tanggal ini');
              // Show no schedule message
              this.createNoScheduleDay(day, dateStr);
            }
            this.isLoadingDetail = false;
          },
          error: (error) => {
            console.error('Error loading day schedule:', error);
            // Jika error 404, berarti tidak ada jadwal
            if (error.status === 404) {
              console.log('Tidak ada jadwal untuk tanggal ini');
              this.createNoScheduleDay(day, dateStr);
            } else {
              this.presentToast('Gagal memuat detail jadwal', 'danger');
              // Create no schedule day
              this.createNoScheduleDay(day, dateStr);
            }
            this.isLoadingDetail = false;
          }
        });
    }
  }
  
  // Create a day with no schedule
  createNoScheduleDay(day: CalendarDay, dateStr: string) {
    day.shift = 'libur';
    day.jadwal = {
      shift: 'libur',
      tanggal: dateStr,
      tanggal_lengkap: format(day.date!, 'EEEE, d MMMM yyyy', { locale: id }),
      shift_label: 'Tidak Ada Jadwal',
      jam_mulai: null,
      jam_selesai: null,
      lokasi: null,
      lokasi_detail: null,
      catatan: 'Anda tidak memiliki jadwal kerja untuk hari ini.',
      is_active: true,
      is_today: isToday(day.date!),
      teammates: []
    };
    this.selectedDate = day;
    this.selectedDateFormatted = format(day.date!, 'EEEE, d MMMM yyyy', { locale: id });
  }

  // Get shift label
  getShiftLabel(shift: string): string {
    switch(shift) {
      case 'pagi': return 'Pagi';
      case 'siang': return 'Siang';
      case 'malam': return 'Malam';
      case 'libur': return 'Libur';
      default: return '';
    }
  }

  // Get shift time range
  getShiftTime(shift: string): string {
    switch(shift) {
      case 'pagi': return '06:00 - 14:00';
      case 'siang': return '14:00 - 22:00';
      case 'malam': return '22:00 - 06:00';
      default: return '';
    }
  }

  // Check if this is the current active shift
  isCurrentShift(shift: string): boolean {
    if (!shift || shift === 'libur') return false;
    
    const now = new Date();
    const hour = now.getHours();
    
    if (shift === 'pagi' && hour >= 6 && hour < 14) return true;
    if (shift === 'siang' && hour >= 14 && hour < 22) return true;
    if (shift === 'malam' && (hour >= 22 || hour < 6)) return true;
    
    return false;
  }

  // Present toast message
  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  // Fungsi untuk memilih tanggal hari ini
  selectTodayDate() {
    console.log('Memilih tanggal hari ini...');
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Cari CalendarDay untuk hari ini
    const todayCalendarDay = this.calendarDays.find(day => 
      day.date && format(day.date, 'yyyy-MM-dd') === todayStr
    );
    
    if (todayCalendarDay) {
      console.log('Tanggal hari ini ditemukan dalam kalender:', todayCalendarDay);
      
      // Jika jadwal untuk hari ini belum dimuat, coba cari di jadwalData
      if (!todayCalendarDay.jadwal) {
        const todayJadwal = this.jadwalData.find(j => j.tanggal === todayStr);
        if (todayJadwal) {
          console.log('Jadwal hari ini ditemukan di jadwalData:', todayJadwal);
          todayCalendarDay.jadwal = todayJadwal;
        }
      }
      
      this.selectDate(todayCalendarDay);
    } else {
      console.log('Tanggal hari ini tidak ditemukan dalam kalender, mencoba menggunakan API langsung');
      
      // Jika tidak ditemukan dalam calendarDays, coba muat dari API
      const dateStr = format(today, 'yyyy-MM-dd');
      const apiUrl = `${environment.apiUrl}/api/satpam/jadwalkerja/hari/${dateStr}?users_id=${this.userId}`;
      
      this.http.get(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              console.log('Detail jadwal hari ini berhasil dimuat dari API:', response);
              
              // Buat calendar day untuk hari ini
              const newTodayDay: CalendarDay = {
                day: format(today, 'd'),
                date: today,
                isCurrentMonth: true,
                isToday: true,
                shift: response.data.shift,
                jadwal: response.data,
                selected: true
              };
              
              this.selectedDate = newTodayDay;
              this.selectedDateFormatted = response.data.tanggal_lengkap || format(today, 'EEEE, d MMMM yyyy', { locale: id });
            } else {
              console.log('Jadwal hari ini tidak ditemukan di API');
              this.createDummyScheduleForToday();
            }
          },
          error: (error) => {
            console.error('Error loading today schedule from API:', error);
            this.createDummyScheduleForToday();
          }
        });
    }
  }
  
  // Buat jadwal dummy untuk hari ini jika tidak ditemukan
  createDummyScheduleForToday() {
    console.log('Menampilkan informasi tidak ada jadwal untuk hari ini');
    const today = new Date();
    
    const newTodayDay: CalendarDay = {
      day: format(today, 'd'),
      date: today,
      isCurrentMonth: true,
      isToday: true,
      shift: 'libur',
      selected: true,
      jadwal: {
        shift: 'libur',
        tanggal: format(today, 'yyyy-MM-dd'),
        tanggal_lengkap: format(today, 'EEEE, d MMMM yyyy', { locale: id }),
        shift_label: 'Tidak Ada Jadwal',
        jam_mulai: null,
        jam_selesai: null,
        lokasi: null,
        lokasi_detail: null,
        catatan: 'Anda tidak memiliki jadwal kerja untuk hari ini.',
        is_active: true,
        is_today: true,
        teammates: []
      }
    };
    
    this.selectedDate = newTodayDay;
    this.selectedDateFormatted = format(today, 'EEEE, d MMMM yyyy', { locale: id });
  }

  // Refresh data manually
  async doRefresh(event: any) {
    console.log('Refreshing data manually...');
    await this.getUserData();
    await this.loadJadwalData(false);
    
    // Complete the refresh
    if (event) {
      event.target.complete();
    }
    
    this.presentToast('Jadwal berhasil diperbarui', 'success');
  }
  
  // Handle page events
  ionViewWillEnter() {
    // Always refresh user data when page is about to enter
    this.getUserData().then(success => {
      if (success) {
        this.loadJadwalData(false);
      }
    });
  }
}

