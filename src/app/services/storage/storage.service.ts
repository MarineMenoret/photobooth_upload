import { Injectable } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/storage';


@Injectable({
  providedIn: 'root'
})
export class StorageService {
  storageRef;

  constructor(
    private storage: AngularFireStorage,
  ) { }

  /**
  * Uploader un fichier sur storage
  * @param filePath 
  * @param file 
  */
  uploadFile(filePath, file, extension) {
    return this.storage.upload(filePath, file, {contentType : extension})
  }
}
