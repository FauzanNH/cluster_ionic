import { Component, OnInit, Input } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { ModalController, Platform } from '@ionic/angular';
import { Filesystem, Directory } from '@capacitor/filesystem';

@Component({
  selector: 'app-image-preview',
  templateUrl: './image-preview.component.html',
  styleUrls: ['./image-preview.component.scss'],
  standalone: false
})
export class ImagePreviewComponent implements OnInit {
  @Input() previewImage: string = '';
  imageCaption: string = '';
  isLoading: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private platform: Platform
  ) { }

  ngOnInit() {
    if (!this.previewImage) {
      this.openGallery();
    }
  }

  async openGallery() {
    try {
      this.isLoading = true;
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (image) {
        // Konversi URI gambar ke base64 atau blob URL
        const imageData = await this.readAsBase64(image);
        this.previewImage = `data:image/${image.format};base64,${imageData}`;
      }
    } catch (error) {
      console.error('Error accessing gallery:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async readAsBase64(photo: Photo) {
    // "hybrid" will detect Cordova or Capacitor
    if (this.platform.is('hybrid')) {
      // Read the file into base64 format
      const file = await Filesystem.readFile({
        path: photo.path!
      });
      return file.data;
    } else {
      // Fetch the photo, read as a blob, then convert to base64 format
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();
      return await this.convertBlobToBase64(blob) as string;
    }
  }

  convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result?.toString().split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  async send() {
    // Gunakan caption kosong jika pengguna tidak mengisi apa pun
    const caption = this.imageCaption?.trim() || "";
    
    try {
      // Konversi base64 ke File object
      if (this.previewImage) {
        // Extract base64 data from the data URL
        const base64Data = this.previewImage.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        // Determine file type from data URL
        const mimeType = this.previewImage.split(';')[0].split(':')[1];
        const extension = mimeType.split('/')[1];
        
        // Create File object
        const blob = new Blob(byteArrays, { type: mimeType });
        const imageFile = new File([blob], `image_${new Date().getTime()}.${extension}`, { type: mimeType });
        
        console.log('Converted image to File:', {
          name: imageFile.name,
          size: imageFile.size,
          type: imageFile.type
        });
        
        return this.modalCtrl.dismiss({
          image: imageFile,
          caption: caption
        }, 'confirm');
      }
    } catch (error) {
      console.error('Error converting image to File:', error);
    }
    
    // Fallback to original behavior if conversion fails
    return this.modalCtrl.dismiss({
      image: this.previewImage,
      caption: caption
    }, 'confirm');
  }

  async takePhoto() {
    try {
      this.isLoading = true;
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (image) {
        // Konversi URI gambar ke base64 atau blob URL
        const imageData = await this.readAsBase64(image);
        this.previewImage = `data:image/${image.format};base64,${imageData}`;
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    } finally {
      this.isLoading = false;
    }
  }

  chooseAnotherImage() {
    this.openGallery();
  }
} 