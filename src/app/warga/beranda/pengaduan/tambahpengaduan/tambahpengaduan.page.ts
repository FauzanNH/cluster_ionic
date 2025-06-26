import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-tambahpengaduan',
  templateUrl: './tambahpengaduan.page.html',
  styleUrls: ['./tambahpengaduan.page.scss'],
  standalone: false,
})
export class TambahpengaduanPage implements OnInit {
  @ViewChild('fileInput1') fileInput1!: ElementRef;
  @ViewChild('fileInput2') fileInput2!: ElementRef;
  
  pengaduanForm: FormGroup;
  isSubmitted: boolean = false;
  isDropdownOpen: boolean = false;
  
  // Document upload variables
  dokumen1Preview: string | ArrayBuffer | null = null;
  dokumen1Name: string = '';
  dokumen1Type: string = '';
  dokumen1File: File | null = null;
  
  dokumen2Preview: string | ArrayBuffer | null = null;
  dokumen2Name: string = '';
  dokumen2Type: string = '';
  dokumen2File: File | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private toastController: ToastController,
    private http: HttpClient
  ) {
    this.pengaduanForm = this.formBuilder.group({
      jenis: ['', [Validators.required]],
      detail: ['', [Validators.required]],
      lokasi: [''],
      dokumen1: [''],
      dokumen2: ['']
    });
  }

  ngOnInit() {
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }
  
  selectOption(option: string) {
    this.pengaduanForm.get('jenis')?.setValue(option);
    this.isDropdownOpen = false;
  }
  
  // File handling methods
  triggerFileInput(inputNumber: number) {
    if (inputNumber === 1) {
      this.fileInput1.nativeElement.click();
    } else if (inputNumber === 2) {
      this.fileInput2.nativeElement.click();
    }
  }
  
  onFileSelected(event: Event, inputNumber: number) {
    const fileInput = event.target as HTMLInputElement;
    
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        this.showToast('Ukuran file terlalu besar (maksimal 5MB)', 'danger');
        return;
      }
      
      // Handle file based on input number
      if (inputNumber === 1) {
        this.handleFile(file, 1);
      } else if (inputNumber === 2) {
        this.handleFile(file, 2);
      }
    }
  }
  
  handleFile(file: File, inputNumber: number) {
    const fileType = file.type.split('/')[1];
    const validTypes = ['png', 'jpg', 'jpeg', 'pdf'];
    
    if (!validTypes.includes(fileType) && 
        !(fileType === 'octet-stream' && file.name.toLowerCase().endsWith('.pdf'))) {
      this.showToast('Format file tidak didukung', 'danger');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = () => {
      if (inputNumber === 1) {
        this.dokumen1Preview = reader.result;
        this.dokumen1Name = file.name;
        this.dokumen1Type = fileType;
        this.dokumen1File = file;
        this.pengaduanForm.patchValue({dokumen1: file.name});
      } else if (inputNumber === 2) {
        this.dokumen2Preview = reader.result;
        this.dokumen2Name = file.name;
        this.dokumen2Type = fileType;
        this.dokumen2File = file;
        this.pengaduanForm.patchValue({dokumen2: file.name});
      }
    };
    
    reader.readAsDataURL(file);
  }
  
  removeFile(inputNumber: number, event: Event) {
    event.stopPropagation();
    
    if (inputNumber === 1) {
      this.dokumen1Preview = null;
      this.dokumen1Name = '';
      this.dokumen1Type = '';
      this.dokumen1File = null;
      this.pengaduanForm.patchValue({dokumen1: ''});
    } else if (inputNumber === 2) {
      this.dokumen2Preview = null;
      this.dokumen2Name = '';
      this.dokumen2Type = '';
      this.dokumen2File = null;
      this.pengaduanForm.patchValue({dokumen2: ''});
    }
  }
  
  getFileIcon(fileType: string): string {
    if (fileType === 'pdf') {
      return 'document-text-outline';
    } else if (['png', 'jpg', 'jpeg'].includes(fileType)) {
      return 'image-outline';
    } else {
      return 'document-outline';
    }
  }
  
  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  async submitForm() {
    this.isSubmitted = true;
    
    if (this.pengaduanForm.invalid) {
      const toast = await this.toastController.create({
        message: 'Mohon lengkapi semua field yang wajib diisi',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
      return;
    }
    
    await this.submitPengaduanApi();
  }

  async submitPengaduanApi() {
    const userStr = localStorage.getItem('user');
    let users_id = '';
    let blok_rt = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        users_id = user.users_id || user.id || '';
        blok_rt = user.rt_blok || '';
      } catch (e) {}
    }
    if (!users_id) {
      this.showToast('User tidak ditemukan, silakan login ulang', 'danger');
      return;
    }

    const formData = new FormData();
    formData.append('jenis_pengaduan', this.pengaduanForm.value.jenis);
    formData.append('detail_pengaduan', this.pengaduanForm.value.detail);
    formData.append('lokasi', this.pengaduanForm.value.lokasi || '');
    formData.append('users_id', String(Number(users_id)));
      formData.append('blok_rt', blok_rt);
    if (this.dokumen1File) {
      formData.append('dokumen1', this.dokumen1File, this.dokumen1Name);
    }
    if (this.dokumen2File) {
      formData.append('dokumen2', this.dokumen2File, this.dokumen2Name);
    }

    this.http.post(`${environment.apiUrl}/api/warga/pengaduan/store`, formData).subscribe({
      next: async (res: any) => {
        if (res.success) {
          await this.showToast('Pengaduan berhasil dikirim', 'success');
          this.router.navigate(['/warga/beranda/pengaduan']);
        } else {
          await this.showToast(res.message || 'Gagal mengirim pengaduan', 'danger');
        }
      },
      error: async (err) => {
        let msg = 'Gagal mengirim pengaduan';
        if (err.error && err.error.message) msg = err.error.message;
        await this.showToast(msg, 'danger');
      }
    });
  }
}
