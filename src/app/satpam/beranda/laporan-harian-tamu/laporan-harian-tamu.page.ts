import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { LoadingController } from '@ionic/angular';

interface KunjunganTamu {
  id_kunjungan: string;
  nama_tamu: string;
  tanggal: string;
  tujuan: string;
  blok: string;
  status?: string;
  waktu_masuk: string;
  waktu_keluar?: string;
  created_at?: string;
}

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
  selector: 'app-laporan-harian-tamu',
  templateUrl: './laporan-harian-tamu.page.html',
  styleUrls: ['./laporan-harian-tamu.page.scss'],
  standalone: false,
})
export class LaporanHarianTamuPage implements OnInit {
  allVisits: KunjunganTamu[] = [];
  todayVisits: KunjunganTamu[] = [];
  yesterdayVisits: KunjunganTamu[] = [];
  weekVisits: KunjunganTamu[] = [];
  monthVisits: KunjunganTamu[] = [];
  filteredVisits: KunjunganTamu[] = [];
  
  totalHariIni: number = 0;
  totalBulanIni: number = 0;
  
  isLoading: boolean = false;
  searchTerm: string = '';
  activeTab: string = 'semua';
  
  // Filter Modal Properties
  isFilterModalOpen: boolean = false;
  isDatePickerOpen: boolean = false;
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
    private http: HttpClient,
    private loadingController: LoadingController
  ) { }

  async ngOnInit() {
    await this.presentLoading('Memuat data...');
    this.initCalendar();
    await this.loadData();
    this.loadingController.dismiss();
  }

  async presentLoading(message: string) {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: message,
      spinner: 'crescent'
    });
    await loading.present();
    return loading;
  }

  async loadData() {
    try {
      this.isLoading = true;
      
      // Mendapatkan statistik kunjungan
      await this.fetchWithFallback(
        `${environment.apiUrl}/api/satpam/laporan/statistik`,
        (data) => {
          this.totalHariIni = data.total_hari_ini;
          this.totalBulanIni = data.total_bulan_ini;
        },
        () => {
          this.totalHariIni = 0;
          this.totalBulanIni = 0;
        }
      );

      // Mendapatkan kunjungan hari ini
      await this.fetchWithFallback(
        `${environment.apiUrl}/api/satpam/laporan/harian`,
        (data) => {
          this.todayVisits = data;
        },
        () => {
          this.todayVisits = [];
        }
      );

      // Mendapatkan kunjungan bulan ini
      await this.fetchWithFallback(
        `${environment.apiUrl}/api/satpam/laporan/bulanan`,
        (data) => {
          this.monthVisits = data;
          this.allVisits = [...this.monthVisits];
          this.groupVisitsByDate(); // Mengelompokkan kunjungan berdasarkan periode
          this.filteredVisits = [...this.allVisits];
        },
        () => {
          // Jika gagal, inisialisasi dengan array kosong
          this.monthVisits = [];
          this.allVisits = [];
          this.filteredVisits = [];
          this.yesterdayVisits = [];
          this.weekVisits = [];
        }
      );
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback ke data kosong jika ada error tak tertangani
      this.todayVisits = [];
      this.yesterdayVisits = [];
      this.weekVisits = [];
      this.monthVisits = [];
      this.allVisits = [];
      this.filteredVisits = [];
      this.totalHariIni = 0;
      this.totalBulanIni = 0;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Helper untuk melakukan fetch dengan fallback
   */
  async fetchWithFallback(url: string, successCallback: (data: any) => void, fallbackCallback: () => void) {
    try {
      const response: any = await this.http.get(url).toPromise();
      if (response && response.success && response.data) {
        successCallback(response.data);
      } else {
        fallbackCallback();
      }
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      fallbackCallback();
    }
  }

  /**
   * Mengelompokkan kunjungan berdasarkan periode waktu
   */
  groupVisitsByDate() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Tanggal awal minggu (Minggu ini)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Tanggal awal bulan
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Reset koleksi
    this.todayVisits = [];
    this.yesterdayVisits = [];
    this.weekVisits = [];
    this.monthVisits = [];
    
    // Kelompokkan kunjungan berdasarkan periode
    this.allVisits.forEach(visit => {
      // Parse tanggal kunjungan
      const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
      
      if (this.isSameDay(visitDate, today)) {
        this.todayVisits.push(visit);
      } else if (this.isSameDay(visitDate, yesterday)) {
        this.yesterdayVisits.push(visit);
      } else if (visitDate >= startOfWeek && visitDate < yesterday) {
        this.weekVisits.push(visit);
      } else if (visitDate >= startOfMonth && visitDate < startOfWeek) {
        this.monthVisits.push(visit);
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
    // Untuk mendapatkan range tahun yang tepat seperti pada gambar (2016-2027)
    // Kita akan mengatur yearRangeStart ke tahun yang sesuai
    const currentYear = new Date().getFullYear();
    // Misalnya untuk tahun 2025, kita ingin range 2016-2027
    this.yearRangeStart = 2016; // Tetapkan nilai awal yang sesuai dengan gambar
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

  async selectDate(day: CalendarDay) {
    this.selectedDate = day.dateString;
    this.calendarDays.forEach(d => d.selected = d.dateString === day.dateString);
    
    // Auto-apply filter when date is selected
    await this.loadDataByTanggal(day.dateString);
    this.selectedPeriod = null;
    this.closeDatePicker();
  }

  async loadDataByTanggal(tanggal: string) {
    try {
      this.isLoading = true;
      await this.fetchWithFallback(
        `${environment.apiUrl}/api/satpam/laporan/by-tanggal?tanggal=${tanggal}`,
        (data) => {
          this.filteredVisits = data;
          this.todayVisits = [...data]; // Tampilkan pada bagian "Hari Ini" (walaupun bukan hari ini)
          this.yesterdayVisits = [];
          this.weekVisits = [];
          this.monthVisits = [];
        },
        () => {
          this.filteredVisits = [];
          this.todayVisits = [];
          this.yesterdayVisits = [];
          this.weekVisits = [];
          this.monthVisits = [];
        }
      );
    } catch (error) {
      console.error('Error loading data by date:', error);
      this.filteredVisits = [];
      this.todayVisits = [];
      this.yesterdayVisits = [];
      this.weekVisits = [];
      this.monthVisits = [];
    } finally {
      this.isLoading = false;
    }
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
    // Mundur 12 tahun
    this.yearRangeStart -= 12;
    this.years = [];
    for (let i = 0; i < 12; i++) {
      this.years.push(this.yearRangeStart + i);
    }
  }

  nextYearSet() {
    // Maju 12 tahun
    this.yearRangeStart += 12;
    this.years = [];
    for (let i = 0; i < 12; i++) {
      this.years.push(this.yearRangeStart + i);
    }
  }

  // Search Functions
  onSearchChange(event: any) {
    this.searchTerm = event.detail.value.toLowerCase();
    this.filterVisits();
  }

  filterByTab(tab: string) {
    this.activeTab = tab;
    this.filterVisits();
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
    this.selectedDate = null;
    this.selectedPeriod = null;
    this.loadData(); // Reset data ke nilai awal
  }

  async applyFilter() {
    this.filterVisits();
    this.closeFilterModal();
  }

  filterVisits() {
    // Filter berdasarkan search term
    let filtered = [...this.allVisits];
    
    if (this.searchTerm) {
      filtered = filtered.filter(visit => 
        (visit.nama_tamu?.toLowerCase() || '').includes(this.searchTerm) ||
        visit.id_kunjungan.toLowerCase().includes(this.searchTerm)
      );
    }
    
    // Filter berdasarkan tanggal yang dipilih
    if (this.selectedDate) {
      const formattedSelectedDate = this.formatDateDisplay(this.selectedDate);
      filtered = filtered.filter(visit => {
        const visitDate = this.formatDateDisplay(visit.created_at || visit.tanggal);
        return visitDate === formattedSelectedDate;
      });
    }
    
    // Filter berdasarkan periode
    if (this.selectedPeriod) {
      const today = new Date();
      const todayStr = this.formatDate(today);
      
      if (this.selectedPeriod === 'today') {
        filtered = filtered.filter(visit => {
          const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
          return this.isSameDay(visitDate, today);
        });
      } 
      else if (this.selectedPeriod === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = filtered.filter(visit => {
          const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
          return this.isSameDay(visitDate, yesterday);
        });
      }
      else if (this.selectedPeriod === '7days') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = filtered.filter(visit => {
          const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
          return visitDate >= sevenDaysAgo && visitDate <= today;
        });
      }
      else if (this.selectedPeriod === '30days') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter(visit => {
          const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
          return visitDate >= thirtyDaysAgo && visitDate <= today;
        });
      }
    }
    
    this.filteredVisits = filtered;
    
    // Re-group the filtered visits
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Reset and regroup
    this.todayVisits = [];
    this.yesterdayVisits = [];
    this.weekVisits = [];
    this.monthVisits = [];
    
    this.filteredVisits.forEach(visit => {
      const visitDate = visit.created_at ? new Date(visit.created_at) : this.parseDate(visit.tanggal);
      
      if (this.isSameDay(visitDate, today)) {
        this.todayVisits.push(visit);
      } else if (this.isSameDay(visitDate, yesterday)) {
        this.yesterdayVisits.push(visit);
      } else if (visitDate >= startOfWeek && visitDate < yesterday) {
        this.weekVisits.push(visit);
      } else if (visitDate >= startOfMonth && visitDate < startOfWeek) {
        this.monthVisits.push(visit);
      }
    });
  }

  parseDate(dateString: string): Date {
    // Format: DD/MM/YYYY
    const parts = dateString.split('/');
    return new Date(+parts[2], +parts[1] - 1, +parts[0]);
  }

  formatDate(date: Date): string {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
}
