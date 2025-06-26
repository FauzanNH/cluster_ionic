import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { TabHistoryService } from '../services/tab-history.service';

@Component({
  selector: 'app-tamu',
  templateUrl: './tamu.page.html',
  styleUrls: ['./tamu.page.scss'],
  standalone: false,
})
export class TamuPage implements OnInit {

  constructor(
    private platform: Platform,
    private router: Router,
    private tabHistory: TabHistoryService
  ) {
    this.platform.backButton.subscribeWithPriority(10, () => {
      const prevUrl = this.tabHistory.pop();
      if (prevUrl) {
        this.router.navigateByUrl(prevUrl);
      }
    });
  }

  ngOnInit() {
  }

  onTabClick(tab: string) {
    const url = `/tamu/${tab}`;
    this.tabHistory.setActiveTab(tab);
    this.tabHistory.reset(tab, url);
    this.router.navigateByUrl(url);
  }
  
  /**
   * Method untuk logout dari aplikasi tamu
   * Menghapus data dari localStorage dan navigasi ke halaman login
   */
  logout(): void {
    // Hapus data dari localStorage
    localStorage.clear();
    
    // Navigasi ke halaman login tamu
    this.router.navigate(['/login']);
  }
}
