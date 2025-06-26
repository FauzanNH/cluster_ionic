import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-guide',
  templateUrl: './guide.page.html',
  styleUrls: ['./guide.page.scss'],
  standalone: false,
})
export class GuidePage implements OnInit {
  // Track which accordion sections are expanded
  expandedSections: { [key: string]: boolean } = {
    'beranda': true,
    'kunjunganTamu': false,
    'laporanHarian': false,
    'jadwalKerja': false,
    'troubleshooting': false
  };

  constructor() { }

  ngOnInit() {
  }
  
  // Toggle accordion sections
  toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }
  
  // Check if a section is expanded
  isSectionExpanded(section: string): boolean {
    return this.expandedSections[section];
  }
  
  // Scroll to specific section
  scrollToSection(elementId: string) {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  }
}
