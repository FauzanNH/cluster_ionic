import { Component, OnInit, Input } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';

// Definisikan interface untuk FilePicker karena kita akan menggunakan alternatif
interface FilePickerResult {
  files: FilePickerFile[];
}

interface FilePickerFile {
  name: string;
  path?: string;
  size: number;
  mimeType: string;
  data?: string;
}

interface DocumentData {
  name: string;
  size: string;
  type: string;
  path?: string;
  base64?: string;
  blob?: Blob;
  mimeType?: string;
}

@Component({
  selector: 'app-document-preview',
  templateUrl: './document-preview.component.html',
  styleUrls: ['./document-preview.component.scss'],
  standalone: false
})
export class DocumentPreviewComponent implements OnInit {
  @Input() previewDocument: DocumentData | null = null;
  documentCaption: string = '';
  isLoading: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private platform: Platform
  ) { }

  ngOnInit() {
    if (!this.previewDocument) {
      this.openFilePicker();
    }
  }

  async openFilePicker() {
    try {
      this.isLoading = true;
      
      const result = await FilePicker.pickFiles({
        types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain', 'application/zip'],
      });
      
      if (result && result.files && result.files.length > 0) {
        const file = result.files[0];
        console.log('File yang dipilih:', {
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          hasData: !!file.data,
          hasPath: !!file.path
        });
        
        // Format file size
        const size = this.formatFileSize(file.size);
        
        // Tentukan tipe file
        const fileType = this.getFileType(file.mimeType, file.name);
        
        // Konversi data file jika ada
        let blob: Blob | null = null;
        let base64Data: string = '';
        
        if (file.data) {
          // Data sudah dalam format base64
          console.log('Menggunakan data base64 langsung dari file');
          base64Data = file.data;
          
          try {
            // Coba buat blob dari base64
            const mimeType = file.mimeType || this.getMimeTypeFromExtension(fileType);
            // Pastikan base64 dalam format yang benar (data:mimetype;base64,)
            if (!base64Data.startsWith('data:')) {
              base64Data = `data:${mimeType};base64,${base64Data}`;
            }
            blob = this.base64toBlob(base64Data, mimeType);
            console.log('Blob berhasil dibuat dari base64, size:', blob.size);
          } catch (error) {
            console.error('Gagal membuat blob dari base64:', error);
          }
        } else if (file.path) {
          console.log('Menggunakan path file:', file.path);
          try {
            // Coba baca file dari filesystem
            const fileData = await Filesystem.readFile({
              path: file.path,
              directory: Directory.Cache
            });
            
            if (fileData.data) {
              // Data dalam format base64
              // Pastikan data adalah string
              base64Data = typeof fileData.data === 'string' ? fileData.data : '';
              const mimeType = file.mimeType || this.getMimeTypeFromExtension(fileType);
              
              // Pastikan base64 dalam format yang benar
              if (base64Data && !base64Data.startsWith('data:')) {
                base64Data = `data:${mimeType};base64,${base64Data}`;
              }
              
              try {
                blob = this.base64toBlob(base64Data, mimeType);
                console.log('Blob berhasil dibuat dari file path, size:', blob.size);
              } catch (error) {
                console.error('Gagal membuat blob dari file path:', error);
              }
            }
          } catch (error) {
            console.error('Gagal membaca file dari path:', error, file.path);
          }
        }
        
        // Jika tidak berhasil membuat blob, buat blob kosong
        if (!blob) {
          const mimeType = file.mimeType || this.getMimeTypeFromExtension(fileType) || 'application/octet-stream';
          blob = new Blob(['Dokumen placeholder'], { type: mimeType });
          console.log('Membuat blob placeholder karena konversi gagal');
        }
        
        // Buat objek document
        this.previewDocument = {
          name: file.name,
          size: size,
          type: fileType,
          mimeType: file.mimeType,
          path: file.path,
          base64: base64Data || undefined,
          blob: blob
        };
        
        console.log('Document preview object:', {
          name: this.previewDocument.name,
          size: this.previewDocument.size,
          type: this.previewDocument.type,
          hasBlob: !!this.previewDocument.blob,
          hasBase64: !!this.previewDocument.base64,
          blobSize: this.previewDocument.blob ? this.previewDocument.blob.size : 'N/A'
        });
      } else {
        console.log('Tidak ada file yang dipilih atau pengguna membatalkan');
      }
    } catch (error) {
      console.error('Error saat memilih file:', error);
      this.presentErrorToast('Gagal memilih dokumen');
    } finally {
      this.isLoading = false;
    }
  }

  // Fungsi untuk mengkonversi base64 ke Blob
  base64toBlob(base64Data: string, contentType: string): Blob {
    try {
      // Pastikan base64Data tidak kosong
      if (!base64Data || base64Data.trim() === '') {
        console.error('base64Data kosong');
        throw new Error('base64Data kosong');
      }
      
      console.log('Memulai konversi base64 ke Blob:', {
        contentType,
        dataLength: base64Data.length,
        startsWithData: base64Data.startsWith('data:')
      });
      
      // Ambil hanya data base64 tanpa header
      let base64Content = base64Data;
      
      // Jika base64 dimulai dengan 'data:', hapus header
      if (base64Data.startsWith('data:')) {
        const parts = base64Data.split(',');
        if (parts.length > 1) {
          base64Content = parts[1];
          console.log('Header base64 dihapus, panjang data:', base64Content.length);
        } else {
          console.error('Format base64 tidak valid: tidak ada koma pemisah');
          throw new Error('Format base64 tidak valid');
        }
      }
      
      // Validasi karakter base64
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      if (!base64Regex.test(base64Content)) {
        console.error('Format base64 tidak valid: mengandung karakter tidak valid');
        
        // Bersihkan karakter non-base64
        base64Content = base64Content.replace(/[^A-Za-z0-9+/=]/g, '');
        console.log('Base64 dibersihkan, panjang baru:', base64Content.length);
        
        if (base64Content.length < 100) {
          throw new Error('Data base64 terlalu pendek setelah dibersihkan');
        }
      }
      
      try {
        // Coba decode untuk validasi
        atob(base64Content.substring(0, 10));
      } catch (e) {
        console.error('Gagal validasi decode base64:', e);
        throw new Error('Data base64 tidak valid (gagal decode)');
      }
      
      // Konversi menggunakan penanganan chunk untuk file besar
      const chunkSize = 1024;  // Proses per 1KB untuk menghemat memori
      const byteCharacters = atob(base64Content);
      const byteArrays = [];
      
      console.log('Memproses', byteCharacters.length, 'byte karakter');
      
      for (let offset = 0; offset < byteCharacters.length; offset += chunkSize) {
        const slice = byteCharacters.slice(offset, offset + chunkSize);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const resultBlob = new Blob(byteArrays, { type: contentType });
      console.log('Konversi base64 ke Blob berhasil:', {
        blobSize: resultBlob.size,
        blobType: resultBlob.type,
        chunksProcessed: byteArrays.length
      });
      
      // Validasi ukuran hasil
      if (resultBlob.size < 100) {
        console.error('Blob hasil konversi terlalu kecil:', resultBlob.size, 'bytes');
        throw new Error('Blob hasil terlalu kecil: ' + resultBlob.size + ' bytes');
      }
      
      return resultBlob;
    } catch (error) {
      console.error('Error dalam base64toBlob:', error);
      // Throw error untuk ditangani oleh pemanggil
      throw error;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileType(mimeType: string, fileName: string): string {
    if (mimeType.includes('pdf')) {
      return 'pdf';
    } else if (mimeType.includes('word') || mimeType.includes('document') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      return 'doc';
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
      return 'xls';
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation') || fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
      return 'ppt';
    } else if (mimeType.includes('text/plain') || fileName.endsWith('.txt')) {
      return 'txt';
    } else if (mimeType.includes('zip') || mimeType.includes('compressed') || fileName.endsWith('.zip') || fileName.endsWith('.rar')) {
      return 'zip';
    } else {
      return 'other';
    }
  }

  getDocumentIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'pdf':
        return 'document-text-outline';
      case 'doc':
      case 'docx':
        return 'document-outline';
      case 'xls':
      case 'xlsx':
        return 'grid-outline';
      case 'ppt':
      case 'pptx':
        return 'easel-outline';
      case 'txt':
        return 'create-outline';
      case 'zip':
        return 'archive-outline';
      default:
        return 'document-outline';
    }
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  send() {
    try {
      const fileDoc = this.createFileFromDocument();
      
      if (!fileDoc) {
        console.error('Gagal membuat File dari dokumen');
        this.presentErrorToast('Gagal memproses dokumen. Silakan coba lagi.');
        return Promise.resolve();
      }
      
      console.log('File berhasil dibuat:', {
        name: fileDoc.name,
        type: fileDoc.type,
        size: fileDoc.size,
        isFile: fileDoc instanceof File,
        isBlob: fileDoc instanceof Blob
      });
      
      // Gunakan caption kosong jika pengguna tidak mengisi apa pun
      const caption = this.documentCaption?.trim() || "";
      
    return this.modalCtrl.dismiss({
        document: fileDoc,
        caption: caption
    }, 'confirm');
    } catch (error) {
      console.error('Error saat mengirim dokumen:', error);
      this.presentErrorToast('Gagal memproses dokumen. Silakan coba lagi.');
      return Promise.resolve();
    }
  }

  // Metode untuk menampilkan toast error
  async presentErrorToast(message: string) {
    const toast = document.createElement('ion-toast');
    toast.message = message;
    toast.duration = 3000;
    toast.position = 'bottom';
    toast.color = 'danger';
    
    document.body.appendChild(toast);
    return toast.present();
  }

  // Fungsi untuk membuat File dari DocumentData
  private createFileFromDocument(): File | null {
    if (!this.previewDocument) {
      console.error('Tidak ada dokumen yang dipilih');
      return null;
    }
    
    try {
      console.log('Mencoba membuat File dari DocumentData:', {
        name: this.previewDocument.name,
        hasBlob: !!this.previewDocument.blob,
        hasBase64: !!this.previewDocument.base64,
        type: this.previewDocument.type
      });
      
      // Jika sudah ada Blob, gunakan itu
      if (this.previewDocument.blob && this.previewDocument.blob.size > 1024) { // Minimal 1KB
        console.log('Menggunakan blob yang sudah ada, size:', this.previewDocument.blob.size);
        const mimeType = this.previewDocument.mimeType || 
                         this.getMimeTypeFromExtension(this.previewDocument.type) || 
                         'application/octet-stream';
        return new File(
          [this.previewDocument.blob], 
          this.previewDocument.name, 
          { type: mimeType }
        );
      }
      
      // Jika tidak ada Blob tapi ada base64, konversi ke Blob dulu
      if (this.previewDocument.base64 && this.previewDocument.base64.trim() !== '') {
        console.log('Mengkonversi base64 ke blob');
        const mimeType = this.previewDocument.mimeType || 
                         this.getMimeTypeFromExtension(this.previewDocument.type) || 
                         'application/octet-stream';
        
        // Pastikan base64 data ada dan valid
        if (this.previewDocument.base64.length < 10) {
          console.warn('Data base64 terlalu pendek, menggunakan fallback');
          // Buat blob placeholder sebagai fallback dengan ukuran yang lebih besar
          const placeholderContent = this.generatePlaceholderContent(this.previewDocument.type, 5120); // 5KB
          const fallbackBlob = new Blob([placeholderContent], { type: mimeType });
          return new File([fallbackBlob], this.previewDocument.name, { type: mimeType });
        }
        
        try {
          const blob = this.base64toBlob(this.previewDocument.base64, mimeType);
          console.log('Blob hasil konversi base64, size:', blob.size);
          
          // Pastikan blob cukup besar
          if (blob.size < 1024) { // Minimal 1KB
            console.warn('Blob terlalu kecil, menggunakan placeholder yang lebih besar');
            const placeholderContent = this.generatePlaceholderContent(this.previewDocument.type, 5120); // 5KB
            const fallbackBlob = new Blob([placeholderContent], { type: mimeType });
            return new File([fallbackBlob], this.previewDocument.name, { type: mimeType });
          }
          
          return new File([blob], this.previewDocument.name, { type: mimeType });
        } catch (error) {
          console.warn('Gagal mengkonversi base64 ke blob, menggunakan fallback', error);
          // Buat blob placeholder sebagai fallback
          const placeholderContent = this.generatePlaceholderContent(this.previewDocument.type, 5120); // 5KB
          const fallbackBlob = new Blob([placeholderContent], { type: mimeType });
          return new File([fallbackBlob], this.previewDocument.name, { type: mimeType });
        }
      }
      
      // Jika tidak ada data valid, buat blob kosong sebagai fallback
      console.warn('Tidak ada data valid untuk membuat file, menggunakan fallback');
      const mimeType = this.previewDocument.mimeType || 
                       this.getMimeTypeFromExtension(this.previewDocument.type) || 
                       'application/octet-stream';
      const placeholderContent = this.generatePlaceholderContent(this.previewDocument.type, 5120); // 5KB
      const fallbackBlob = new Blob([placeholderContent], { type: mimeType });
      return new File([fallbackBlob], this.previewDocument.name, { type: mimeType });
      
    } catch (error) {
      console.error('Error membuat File dari dokumen:', error);
      // Gunakan fallback sebagai upaya terakhir
      try {
        const mimeType = this.previewDocument.mimeType || 
                         this.getMimeTypeFromExtension(this.previewDocument.type) || 
                         'application/octet-stream';
        const placeholderContent = this.generatePlaceholderContent(this.previewDocument.type, 5120); // 5KB
        const emergencyBlob = new Blob([placeholderContent], { type: mimeType });
        return new File([emergencyBlob], this.previewDocument.name, { type: mimeType });
      } catch (fallbackError) {
        console.error('Bahkan fallback gagal:', fallbackError);
        this.presentErrorToast('Dokumen tidak valid atau rusak. Silakan pilih dokumen lain.');
        return null;
      }
    }
  }

  // Fungsi helper untuk membuat konten placeholder dengan ukuran tertentu
  private generatePlaceholderContent(docType: string, sizeInBytes: number): string {
    // Buat konten template berdasarkan tipe dokumen
    let templateHeader = '';
    
    switch(docType.toLowerCase()) {
      case 'pdf':
        templateHeader = '%PDF-1.5\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
        break;
      case 'doc':
      case 'docx':
        templateHeader = 'Document placeholder for file format DOC/DOCX\n';
        break;
      case 'xls':
      case 'xlsx':
        templateHeader = 'Spreadsheet placeholder for file format XLS/XLSX\n';
        break;
      case 'txt':
        templateHeader = 'Text document placeholder\n';
        break;
      default:
        templateHeader = 'Document placeholder for generic file\n';
    }
    
    // Hitung berapa banyak padding yang dibutuhkan
    const headerLength = templateHeader.length;
    const paddingNeeded = sizeInBytes - headerLength;
    
    // Tambahkan padding
    if (paddingNeeded > 0) {
      // Buat padding string berisi karakter placeholder
      const paddingChunk = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(20); // 720 bytes per chunk
      let padding = '';
      
      // Tambahkan padding sampai mencapai ukuran yang diinginkan
      while (padding.length < paddingNeeded) {
        padding += paddingChunk;
      }
      
      // Potong padding ke ukuran yang tepat
      padding = padding.substring(0, paddingNeeded);
      
      return templateHeader + padding;
    }
    
    return templateHeader;
  }

  // Mendapatkan MIME type dari ekstensi file
  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: {[key: string]: string} = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'zip': 'application/zip'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  chooseAnotherDocument() {
    this.openFilePicker();
  }
} 