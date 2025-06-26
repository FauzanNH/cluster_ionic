import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { KunjungantamuService, KunjunganTamu } from './kunjungantamu.service';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

interface CalendarDay {
  day: number;
  month: number;
  year: number;
  otherMonth: boolean;
  today: boolean;
  selected: boolean;
  dateString: string;
}

@Component({
  selector: 'app-kunjungantamu',
  templateUrl: './kunjungantamu.page.html',
  styleUrls: ['./kunjungantamu.page.scss'],
  standalone: false,
})
export class KunjungantamuPage implements OnInit {
  allVisits: KunjunganTamu[] = [];
  todayVisits: KunjunganTamu[] = [];
  weekVisits: KunjunganTamu[] = [];
  monthVisits: KunjunganTamu[] = [];
  filteredVisits: KunjunganTamu[] = [];
  searchTerm: string = '';
  activeTab: string = 'semua';
  isLoading: boolean = false;
  
  // FAB button properties
  fabListOpen: boolean = false;
  
  // Filter Modal Properties
  isFilterModalOpen: boolean = false;
  isDatePickerOpen: boolean = false;
  isActionModalOpen: boolean = false;
  filterStatus: string = 'semua';
  selectedDate: string | null = null;
  selectedPeriod: string | null = null;

  // Calendar Properties
  viewMode: 'calendar' | 'year' | 'month' = 'calendar';
  currentDate: Date = new Date();
  currentYear: number = this.currentDate.getFullYear();
  currentMonthIndex: number = this.currentDate.getMonth();
  currentMonth: string = '';
  calendarDays: CalendarDay[] = [];
  dayNames: string[] = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];
  monthNames: string[] = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  years: number[] = [];
  yearRangeStart: number = 0;
  showYearInput: boolean = false;
  yearInput: number = new Date().getFullYear();

  constructor(
    private router: Router,
    private kunjunganService: KunjungantamuService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.initCalendar();
    this.loadKunjunganData();
  }

  async refreshData(event?: any) {
    await this.loadKunjunganData();
    if (event) {
      event.target.complete();
    }
  }

  async loadKunjunganData() {
    this.isLoading = true;
    
    try {
      // Tampilkan loading
      const loading = await this.loadingCtrl.create({
        message: 'Memuat data kunjungan...',
        spinner: 'crescent'
      });
      await loading.present();
      
      // Ambil data kunjungan dari API
      this.kunjunganService.getKunjunganList().subscribe({
        next: (response) => {
          console.log('API Response:', response); // Debug log
          if (response.success) {
            // Simpan data dari API
            this.allVisits = response.data;
            this.filteredVisits = [...this.allVisits];
            this.groupVisitsByDate();
          } else {
            this.presentToast('Gagal memuat data kunjungan', 'danger');
          }
          loading.dismiss();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading kunjungan data:', error);
          this.presentToast('Terjadi kesalahan saat memuat data', 'danger');
          loading.dismiss();
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error in loadKunjunganData:', error);
      this.presentToast('Terjadi kesalahan saat memuat data', 'danger');
      this.isLoading = false;
    }
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

  async confirmAction(kunjunganId: string, action: 'masuk' | 'keluar') {
    const alert = await this.alertCtrl.create({
      header: action === 'masuk' ? 'Konfirmasi Tamu Masuk' : 'Konfirmasi Tamu Keluar',
      message: action === 'masuk' ? 
        'Apakah Anda yakin ingin mengubah status kunjungan menjadi "Sedang Berlangsung"?' : 
        'Apakah Anda yakin ingin mengubah status kunjungan menjadi "Meninggalkan Cluster"?',
      buttons: [
        {
          text: 'Batal',
          role: 'cancel'
        },
        {
          text: 'Ya',
          handler: () => {
            if (action === 'masuk') {
              this.processTamuMasuk(kunjunganId);
            } else {
              this.processTamuKeluar(kunjunganId);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async processTamuMasuk(kunjunganId: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Memproses...',
      spinner: 'crescent'
    });
    await loading.present();

    this.kunjunganService.tamuMasuk(kunjunganId).subscribe({
      next: (response) => {
        loading.dismiss();
        if (response.success) {
          this.presentToast('Status kunjungan berhasil diperbarui', 'success');
          this.loadKunjunganData(); // Refresh data
        } else {
          this.presentToast('Gagal memperbarui status kunjungan', 'danger');
        }
      },
      error: (error) => {
        loading.dismiss();
        console.error('Error updating status:', error);
        this.presentToast('Terjadi kesalahan saat memperbarui status', 'danger');
      }
    });
  }

  async processTamuKeluar(kunjunganId: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Memproses...',
      spinner: 'crescent'
    });
    await loading.present();

    this.kunjunganService.tamuKeluar(kunjunganId).subscribe({
      next: (response) => {
        loading.dismiss();
        if (response.success) {
          this.presentToast('Status kunjungan berhasil diperbarui', 'success');
          this.loadKunjunganData(); // Refresh data
        } else {
          this.presentToast('Gagal memperbarui status kunjungan', 'danger');
        }
      },
      error: (error) => {
        loading.dismiss();
        console.error('Error updating status:', error);
        this.presentToast('Terjadi kesalahan saat memperbarui status', 'danger');
      }
    });
  }

  initCalendar() {
    this.currentMonth = this.monthNames[this.currentMonthIndex];
    this.generateCalendarDays();
    this.generateYears();
  }

  generateCalendarDays() {
    this.calendarDays = [];
    
    // Mendapatkan tanggal 1 bulan ini
    const firstDay = new Date(this.currentYear, this.currentMonthIndex, 1);
    // Mendapatkan hari dalam seminggu (0 = Minggu, 1 = Senin, dst)
    const firstDayOfWeek = firstDay.getDay();
    
    // Mendapatkan hari terakhir bulan ini
    const lastDay = new Date(this.currentYear, this.currentMonthIndex + 1, 0);
    const lastDate = lastDay.getDate();
    
    // Mendapatkan hari terakhir bulan sebelumnya
    const prevMonthLastDay = new Date(this.currentYear, this.currentMonthIndex, 0);
    const prevMonthLastDate = prevMonthLastDay.getDate();
    
    // Menambahkan hari-hari dari bulan sebelumnya
    let prevMonthStartFrom = prevMonthLastDate - firstDayOfWeek + 1;
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevMonth = this.currentMonthIndex - 1 < 0 ? 11 : this.currentMonthIndex - 1;
      const prevYear = prevMonth === 11 ? this.currentYear - 1 : this.currentYear;
      
      const day = prevMonthStartFrom + i;
      const dateString = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      this.calendarDays.push({
        day,
        month: prevMonth,
        year: prevYear,
        otherMonth: true,
        today: this.isToday(day, prevMonth, prevYear),
        selected: this.isSelected(dateString),
        dateString
      });
    }
    
    // Menambahkan hari-hari bulan ini
    for (let i = 1; i <= lastDate; i++) {
      const dateString = `${this.currentYear}-${(this.currentMonthIndex + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      
      this.calendarDays.push({
        day: i,
        month: this.currentMonthIndex,
        year: this.currentYear,
        otherMonth: false,
        today: this.isToday(i, this.currentMonthIndex, this.currentYear),
        selected: this.isSelected(dateString),
        dateString
      });
    }
    
    // Menambahkan hari-hari bulan depan
    const remainingDays = 42 - this.calendarDays.length; // 6 baris x 7 kolom
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonth = this.currentMonthIndex + 1 > 11 ? 0 : this.currentMonthIndex + 1;
      const nextYear = nextMonth === 0 ? this.currentYear + 1 : this.currentYear;
      
      const dateString = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      
      this.calendarDays.push({
        day: i,
        month: nextMonth,
        year: nextYear,
        otherMonth: true,
        today: this.isToday(i, nextMonth, nextYear),
        selected: this.isSelected(dateString),
        dateString
      });
    }
  }

  generateYears() {
    const currentYear = new Date().getFullYear();
    this.yearRangeStart = 2016;
    this.years = [];
    for (let i = 0; i < 12; i++) {
      this.years.push(this.yearRangeStart + i);
    }
  }

  isToday(day: number, month: number, year: number): boolean {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  }

  isSelected(dateString: string): boolean {
    return this.selectedDate === dateString;
  }

  selectDate(day: CalendarDay) {
    this.selectedDate = day.dateString;
    this.calendarDays.forEach(d => d.selected = d.dateString === day.dateString);
  }

  prevMonth() {
    if (this.currentMonthIndex === 0) {
      this.currentMonthIndex = 11;
      this.currentYear--;
    } else {
      this.currentMonthIndex--;
    }
    this.currentMonth = this.monthNames[this.currentMonthIndex];
    this.generateCalendarDays();
  }

  nextMonth() {
    if (this.currentMonthIndex === 11) {
      this.currentMonthIndex = 0;
      this.currentYear++;
    } else {
      this.currentMonthIndex++;
    }
    this.currentMonth = this.monthNames[this.currentMonthIndex];
    this.generateCalendarDays();
  }

  toggleYearMonthView() {
    if (this.viewMode === 'calendar') {
      this.viewMode = 'year';
    } else if (this.viewMode === 'year') {
      this.viewMode = 'calendar';
    } else if (this.viewMode === 'month') {
      this.viewMode = 'calendar';
    }
  }

  selectYear(year: number) {
    this.currentYear = year;
    this.viewMode = 'month';
  }

  selectMonth(monthIndex: number) {
    this.currentMonthIndex = monthIndex;
    this.currentMonth = this.monthNames[monthIndex];
    this.viewMode = 'calendar';
    this.generateCalendarDays();
  }

  prevYearSet() {
    this.yearRangeStart -= 12;
    this.years = [];
    for (let i = 0; i < 12; i++) {
      this.years.push(this.yearRangeStart + i);
    }
  }

  nextYearSet() {
    this.yearRangeStart += 12;
    this.years = [];
    for (let i = 0; i < 12; i++) {
      this.years.push(this.yearRangeStart + i);
    }
  }

  // Filter Modal Functions
  openFilterModal() {
    this.isFilterModalOpen = true;
  }

  closeFilterModal() {
    this.isFilterModalOpen = false;
  }

  showDatePicker() {
    this.isDatePickerOpen = true;
  }

  closeDatePicker() {
    this.isDatePickerOpen = false;
  }

  setFilterStatus(status: string) {
    this.filterStatus = status;
  }

  onDateChange(event: any) {
    if (event && event.detail && event.detail.value) {
      this.selectedDate = event.detail.value.split('T')[0]; // Ambil hanya tanggal (YYYY-MM-DD)
      this.closeDatePicker();
    }
  }

  formatDateDisplay(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  }

  formatMonthYear(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  clearDate() {
    this.selectedDate = null;
    this.calendarDays.forEach(day => day.selected = false);
  }

  confirmDateSelection() {
    this.closeDatePicker();
  }

  resetFilter() {
    this.filterStatus = 'semua';
    this.selectedDate = null;
    this.selectedPeriod = null;
  }

  applyFilter() {
    this.filterVisits();
    this.closeFilterModal();
  }

  parseDate(dateString: string): Date {
    try {
      // Jika dateString adalah format ISO string (dari created_at)
      if (dateString && dateString.includes('T')) {
        return new Date(dateString);
      }
      
    // Format: DD/MM/YYYY
      if (dateString && dateString.includes('/')) {
    const parts = dateString.split('/');
    return new Date(+parts[2], +parts[1] - 1, +parts[0]);
      }
      
      // Default fallback
      return new Date(dateString);
    } catch (error) {
      console.error('Error parsing date:', error, dateString);
      return new Date(); // Fallback to current date
    }
  }

  formatDate(date: Date): string {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  formatDateWithDay(date: Date): string {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const day = days[date.getDay()];
    return `${day}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  formatTime(timeString: string): string {
    if (!timeString || timeString === '-') return '-';
    
    // Jika sudah dalam format HH:MM, kembalikan langsung
    if (/^\d{1,2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // Jika dalam format ISO atau timestamp, konversi ke waktu lokal
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return timeString;
      
      // Hanya ambil jam dan menit dalam format 24 jam
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      return timeString;
    }
  }

  formatDateOnly(dateString: string): string {
    if (!dateString) return '';
    
    try {
      // Cek apakah dateString dalam format DD/MM/YYYY
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          if (!isNaN(date.getTime())) {
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const day = days[date.getDay()];
            return `${day}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
          }
        }
        // Jika format tidak sesuai, kembalikan dateString asli
        return dateString;
      }
      
      // Jika bukan format DD/MM/YYYY, coba parse sebagai ISO date
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.log('Invalid date format:', dateString);
        return dateString;
      }
      
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const day = days[date.getDay()];
      
      // Format: Selasa, 10/6/2025
      return `${day}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return dateString;
    }
  }

  formatFullDateTime(dateTimeString: string): string {
    if (!dateTimeString || dateTimeString === '-') return '-';
    
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return dateTimeString;
      
      // Format tanggal dan waktu lengkap: "10 Juni 2025, 08:30"
      return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formatting full date time:', error, dateTimeString);
      return dateTimeString;
    }
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value.toLowerCase();
    this.filterVisits();
  }

  filterByTab(tab: string) {
    this.activeTab = tab;
    this.filterVisits();
  }

  groupVisitsByDate() {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Tanggal awal minggu (Minggu ini)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Tanggal awal bulan
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Kelompokkan kunjungan berdasarkan periode
    this.todayVisits = this.allVisits.filter(visit => {
      // Gunakan created_at untuk mengelompokkan
      const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
      return this.isSameDay(visitDate, startOfToday);
    });
    
    this.weekVisits = this.allVisits.filter(visit => {
      // Gunakan created_at untuk mengelompokkan
      const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
      return visitDate >= startOfWeek && !this.isSameDay(visitDate, startOfToday);
    });
    
    this.monthVisits = this.allVisits.filter(visit => {
      // Gunakan created_at untuk mengelompokkan
      const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
      return visitDate >= startOfMonth && visitDate < startOfWeek;
    });
  }

  filterVisits() {
    // Filter berdasarkan search term
    let filtered = this.allVisits;
    
    if (this.searchTerm) {
      filtered = filtered.filter(visit => 
        visit.nama_tamu.toLowerCase().includes(this.searchTerm) ||
        visit.id_kunjungan.toLowerCase().includes(this.searchTerm)
      );
    }
    
    // Filter berdasarkan tab aktif / status
    if (this.activeTab === 'berlangsung') {
      filtered = filtered.filter(visit => visit.status === 'Sedang Berlangsung');
    } else if (this.activeTab === 'selesai') {
      filtered = filtered.filter(visit => visit.status === 'Meninggalkan Cluster');
    } else if (this.activeTab === 'menunggu') {
      filtered = filtered.filter(visit => visit.status === 'Menunggu Menuju Cluster');
    }

    // Filter berdasarkan tanggal yang dipilih
    if (this.selectedDate) {
      const formattedSelectedDate = this.formatDateDisplay(this.selectedDate);
      filtered = filtered.filter(visit => visit.tanggal === formattedSelectedDate);
    }
    
    // Filter berdasarkan periode
    if (this.selectedPeriod) {
      const today = new Date();
      const todayStr = this.formatDate(today);
      
      if (this.selectedPeriod === 'today') {
        filtered = filtered.filter(visit => visit.tanggal === todayStr);
  }
      else if (this.selectedPeriod === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = this.formatDate(yesterday);
        filtered = filtered.filter(visit => visit.tanggal === yesterdayStr);
      }
      else if (this.selectedPeriod === '7days') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = filtered.filter(visit => {
          const visitDate = this.parseDate(visit.tanggal);
          return visitDate >= sevenDaysAgo && visitDate <= today;
        });
      }
      else if (this.selectedPeriod === '30days') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter(visit => {
          const visitDate = this.parseDate(visit.tanggal);
          return visitDate >= thirtyDaysAgo && visitDate <= today;
        });
      }
    }
    
    this.filteredVisits = filtered;
    
    // Update the sections based on filtered data
    this.todayVisits = this.filteredVisits.filter(visit => {
      const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
      return this.isSameDay(visitDate, new Date());
    });
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    this.weekVisits = this.filteredVisits.filter(visit => {
      const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
      return visitDate >= startOfWeek && !this.isSameDay(visitDate, today);
    });
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.monthVisits = this.filteredVisits.filter(visit => {
      const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
      return visitDate >= startOfMonth && visitDate < startOfWeek;
    });
  }

  toggleFabList() {
    this.fabListOpen = !this.fabListOpen;
  }
  
  openActionModal() {
    this.isActionModalOpen = true;
  }
  
  closeActionModal() {
    this.isActionModalOpen = false;
  }
  
  onTamuMasuk() {
    // Close the action modal
    this.closeActionModal();
    
    // Navigate to Tamu Masuk page or show modal
    console.log('Tamu Masuk clicked');
    // You can add navigation or modal logic here
    this.router.navigate(['/satpam/beranda/kunjungantamu/tamu-masuk']);
  }
  
  onTamuKeluar() {
    // Close the action modal
    this.closeActionModal();
    
    // Navigate to Tamu Keluar page or show modal
    console.log('Tamu Keluar clicked');
    // You can add navigation or modal logic here
    this.router.navigate(['/satpam/beranda/kunjungantamu/tamu-keluar']);
  }

  onScanQR() {
    // Close the action modal
    this.closeActionModal();
    
    // Navigate to the pilih-scan page
    this.router.navigate(['/satpam/beranda/kunjungantamu/pilih-scan']);
  }

  onTambahAkunTamu() {
    this.router.navigate(['/satpam/beranda/kunjungantamu/tambah-akun-tamu']);
  }
  
  navigateToDetail(kunjunganId: string) {
    this.router.navigate(['/satpam/beranda/kunjungantamu/viewdetail', kunjunganId]);
  }
}
