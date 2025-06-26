import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Dokumen {
  id: string;
  judul: string;
  jenis: string;
  tanggal: string;
  status: 'diproses' | 'selesai' | 'ditolak';
  deskripsi?: string;
  fileUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DokumenService {
  private _dokumenList = new BehaviorSubject<Dokumen[]>([]);

  constructor() {
    // Mock data for testing
    this.initDummyData();
  }

  get dokumen() {
    return this._dokumenList.asObservable();
  }

  getDokumenById(id: string) {
    return this._dokumenList.value.find(dok => dok.id === id);
  }

  tambahDokumen(dokumen: Omit<Dokumen, 'id'>) {
    const newDokumen: Dokumen = {
      ...dokumen,
      id: Date.now().toString()
    };
    
    const currentDokumen = [...this._dokumenList.value];
    this._dokumenList.next([...currentDokumen, newDokumen]);
    
    return newDokumen;
  }

  updateDokumen(id: string, updatedData: Partial<Dokumen>) {
    const currentDokumen = [...this._dokumenList.value];
    const index = currentDokumen.findIndex(dok => dok.id === id);
    
    if (index !== -1) {
      currentDokumen[index] = {
        ...currentDokumen[index],
        ...updatedData
      };
      this._dokumenList.next(currentDokumen);
      return true;
    }
    
    return false;
  }

  hapusDokumen(id: string) {
    const currentDokumen = [...this._dokumenList.value];
    const filteredDokumen = currentDokumen.filter(dok => dok.id !== id);
    
    if (filteredDokumen.length < currentDokumen.length) {
      this._dokumenList.next(filteredDokumen);
      return true;
    }
    
    return false;
  }

  cariDokumen(keyword: string) {
    if (!keyword.trim()) {
      return this._dokumenList.value;
    }
    
    keyword = keyword.toLowerCase();
    return this._dokumenList.value.filter(dok => 
      dok.judul.toLowerCase().includes(keyword) || 
      dok.jenis.toLowerCase().includes(keyword) ||
      dok.deskripsi?.toLowerCase().includes(keyword)
    );
  }

  private initDummyData() {
    const dummyData: Dokumen[] = [
      {
        id: '1',
        judul: 'Surat Keterangan Domisili',
        jenis: 'Keterangan',
        tanggal: '2023-05-15',
        status: 'selesai',
        deskripsi: 'Surat keterangan domisili untuk keperluan administrasi'
      },
      {
        id: '2',
        judul: 'Surat Pengantar KTP',
        jenis: 'Pengantar',
        tanggal: '2023-06-20',
        status: 'diproses',
        deskripsi: 'Surat pengantar untuk pembuatan KTP baru'
      },
      {
        id: '3',
        judul: 'Surat Izin Keramaian',
        jenis: 'Perizinan',
        tanggal: '2023-07-10',
        status: 'ditolak',
        deskripsi: 'Permohonan izin untuk acara keluarga'
      }
    ];
    
    this._dokumenList.next(dummyData);
  }
}
