import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface Aktivitas {
  aktivitas_id: string;
  tamu_id: string;
  judul: string;
  sub_judul: string;
  created_at: string;
  updated_at: string;
}

interface AktivitasFormatted {
  id_aktivitas: string;
  judul: string;
  subjudul: string;
  tanggal: string;
  waktu: string;
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
  selector: 'app-aktivitas',
  templateUrl: './aktivitas.page.html',
  styleUrls: ['./aktivitas.page.scss'],
  standalone: false,
})
export class AktivitasPage implements OnInit {
  allAktivitas: AktivitasFormatted[] = [];
  todayAktivitas: AktivitasFormatted[] = [];
  weekAktivitas: AktivitasFormatted[] = [];
  monthAktivitas: AktivitasFormatted[] = [];
  filteredAktivitas: AktivitasFormatted[] = [];
  searchTerm: string = '';
  tamuData: any;
  isLoading: boolean = false;
  
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

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadTamuData();
    this.initCalendar();
  }

  loadTamuData() {
    // Ambil data tamu dari localStorage
    const tamuString = localStorage.getItem('tamu_data');
    if (tamuString) {
      try {
        this.tamuData = JSON.parse(tamuString);
        console.log('Tamu data loaded:', this.tamuData);
        this.loadAktivitasData(this.tamuData.tamu_id);
      } catch (error) {
        console.error('Error parsing tamu data:', error);
      }
    } else {
      // Coba cari dengan key lain
      const tamuAlt = localStorage.getItem('tamu');
      if (tamuAlt) {
        try {
          this.tamuData = JSON.parse(tamuAlt);
          console.log('Tamu data loaded (alt):', this.tamuData);
          this.loadAktivitasData(this.tamuData.tamu_id);
        } catch (error) {
          console.error('Error parsing alt tamu data:', error);
        }
      } else {
        console.error('No tamu data found in localStorage');
      }
    }
  }

  loadAktivitasData(tamuId: string) {
    this.isLoading = true;
    
    // Buat URL untuk mengambil aktivitas berdasarkan tamu_id
    const url = `${environment.apiUrl}/api/aktivitas/by-tamu/${tamuId}`;
    
    this.http.get<{success: boolean, data: Aktivitas[]}>(url).subscribe({
      next: (response) => {
        console.log('Aktivitas data loaded:', response);
        if (response.success && response.data) {
          // Format data untuk tampilan
          this.allAktivitas = this.formatAktivitasData(response.data);
          this.filteredAktivitas = [...this.allAktivitas];
          // Kelompokkan aktivitas berdasarkan periode
          this.groupAktivitasByDate();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading aktivitas data:', error);
        this.isLoading = false;
        // Jika API belum tersedia, gunakan data dummy untuk testing
        this.loadDummyData();
        this.groupAktivitasByDate();
      }
    });
  }

  formatAktivitasData(data: Aktivitas[]): AktivitasFormatted[] {
    return data.map(item => {
      const createdDate = new Date(item.created_at);
      
      return {
        id_aktivitas: item.aktivitas_id,
        judul: item.judul,
        subjudul: item.sub_judul,
        tanggal: this.formatDate(createdDate),
        waktu: `${createdDate.getHours().toString().padStart(2, '0')}:${createdDate.getMinutes().toString().padStart(2, '0')}`
      };
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
  }

  applyFilter() {
    this.filterAktivitas();
    this.closeFilterModal();
  }

  /**
   * Handle pull-to-refresh
   */
  doRefresh(event: any) {
    console.log('Begin refresh operation');
    
    // Reset filters
    this.resetFilter();
    this.searchTerm = '';
    
    // Jika ada tamu_id, muat ulang data
    if (this.tamuData && this.tamuData.tamu_id) {
      this.loadAktivitasData(this.tamuData.tamu_id);
      
      // Setelah 1.5 detik, selesaikan refresh
      setTimeout(() => {
        console.log('Refresh completed');
        event.target.complete();
      }, 1500);
    } else {
      // Jika tidak ada tamu_id, selesaikan refresh
      console.log('No tamu_id found, cannot refresh data');
      event.target.complete();
    }
  }

  loadDummyData() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 5);
    
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 10);
    
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    // Format tanggal
    const formatDate = (date: Date): string => {
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    };
    
    this.allAktivitas = [
      {
        id_aktivitas: 'AKT-2023-001',
        judul: 'Ganti Nomor HP',
        subjudul: 'Perubahan kontak utama',
        tanggal: formatDate(today),
        waktu: '10:15'
      },
      {
        id_aktivitas: 'AKT-2023-002',
        judul: 'Kunjungan Tamu',
        subjudul: 'Persetujuan kunjungan ke Blok A2/15',
        tanggal: formatDate(today),
        waktu: '08:30'
      },
      {
        id_aktivitas: 'AKT-2023-003',
        judul: 'Pembayaran Iuran',
        subjudul: 'Pembayaran iuran bulanan berhasil',
        tanggal: formatDate(yesterday),
        waktu: '14:20'
      },
      {
        id_aktivitas: 'AKT-2023-004',
        judul: 'Pengaduan Kerusakan',
        subjudul: 'Laporan kerusakan lampu jalan',
        tanggal: formatDate(lastWeek),
        waktu: '09:45'
      }
    ];
    
    this.filteredAktivitas = [...this.allAktivitas];
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

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value.toLowerCase();
    this.filterAktivitas();
  }

  groupAktivitasByDate() {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Tanggal awal minggu (Minggu ini)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Tanggal awal bulan
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Kelompokkan aktivitas berdasarkan periode
    this.todayAktivitas = this.allAktivitas.filter(aktivitas => {
      const aktivitasDate = this.parseDate(aktivitas.tanggal);
      return this.isSameDay(aktivitasDate, startOfToday);
    });
    
    this.weekAktivitas = this.allAktivitas.filter(aktivitas => {
      const aktivitasDate = this.parseDate(aktivitas.tanggal);
      return aktivitasDate >= startOfWeek && !this.isSameDay(aktivitasDate, startOfToday);
    });
    
    this.monthAktivitas = this.allAktivitas.filter(aktivitas => {
      const aktivitasDate = this.parseDate(aktivitas.tanggal);
      return aktivitasDate >= startOfMonth && aktivitasDate < startOfWeek;
    });
  }

  filterAktivitas() {
    // Filter berdasarkan search term
    let filtered = this.allAktivitas;
    
    if (this.searchTerm) {
      filtered = filtered.filter(aktivitas => 
        aktivitas.id_aktivitas.toLowerCase().includes(this.searchTerm) ||
        aktivitas.judul.toLowerCase().includes(this.searchTerm) ||
        aktivitas.subjudul.toLowerCase().includes(this.searchTerm)
      );
    }
    
    // Filter berdasarkan tanggal yang dipilih
    if (this.selectedDate) {
      const formattedSelectedDate = this.formatDateDisplay(this.selectedDate);
      filtered = filtered.filter(aktivitas => aktivitas.tanggal === formattedSelectedDate);
    }
    
    // Filter berdasarkan periode
    if (this.selectedPeriod) {
      const today = new Date();
      const todayStr = this.formatDate(today);
      
      if (this.selectedPeriod === 'today') {
        filtered = filtered.filter(aktivitas => aktivitas.tanggal === todayStr);
      }
      else if (this.selectedPeriod === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = this.formatDate(yesterday);
        filtered = filtered.filter(aktivitas => aktivitas.tanggal === yesterdayStr);
      }
      else if (this.selectedPeriod === '7days') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = filtered.filter(aktivitas => {
          const aktivitasDate = this.parseDate(aktivitas.tanggal);
          return aktivitasDate >= sevenDaysAgo && aktivitasDate <= today;
        });
      }
      else if (this.selectedPeriod === '30days') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter(aktivitas => {
          const aktivitasDate = this.parseDate(aktivitas.tanggal);
          return aktivitasDate >= thirtyDaysAgo && aktivitasDate <= today;
        });
      }
    }
    
    this.filteredAktivitas = filtered;
    
    // Update the sections based on filtered data
    this.todayAktivitas = this.filteredAktivitas.filter(aktivitas => {
      const aktivitasDate = this.parseDate(aktivitas.tanggal);
      return this.isSameDay(aktivitasDate, new Date());
    });
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    this.weekAktivitas = this.filteredAktivitas.filter(aktivitas => {
      const aktivitasDate = this.parseDate(aktivitas.tanggal);
      return aktivitasDate >= startOfWeek && !this.isSameDay(aktivitasDate, today);
    });
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.monthAktivitas = this.filteredAktivitas.filter(aktivitas => {
      const aktivitasDate = this.parseDate(aktivitas.tanggal);
      return aktivitasDate >= startOfMonth && aktivitasDate < startOfWeek;
    });
  }
}
