import { Injectable } from "@angular/core";
import { AngularFireStorage } from "@angular/fire/storage";
import { ListResult, Reference } from "@angular/fire/storage/interfaces";
import { Net, Remote } from "electron";
import { Observable, Subject } from "rxjs";
import { AppConfig } from "../../../environments/environment";
import { ElectronService } from "../../core/services/electron/electron.service";

@Injectable({
  providedIn: "root",
})
export class StorageService {
  downloadProgress: Subject<{ fileName: string, downloadPercentage: number }>;

  constructor(private storage: AngularFireStorage, private electronService: ElectronService) {
    this.downloadProgress = new Subject<{ fileName: string, downloadPercentage: number }>();
  }

  /**
   * Uploader un fichier sur storage
   * @param filePath
   * @param file
   */
  uploadFile(filePath, file, extension) {
    return this.storage.upload(filePath, file, { contentType: extension });
  }

  getFolders(): Observable<ListResult> {
    return this.storage
      .refFromURL(`gs://${AppConfig.firebase.storageBucket}`)
      .listAll();
  }

  getFiles(folder: Reference): void {
    folder.listAll()
      .then((result) => {
        result.items.forEach((item) => {
          this.downloadProgress.next({ fileName: item.name, downloadPercentage: 0 })
          item.getDownloadURL()
            .then(url => this.downloadFile(url, item.name))
            .catch(error => console.log(error))
        })

        result.prefixes.forEach((prefixe) => {
          this.getFiles(prefixe)
        })
      })
      .catch(error => console.log(error));
  }

  downloadFile(file_url: string, fileName: string): void {
    let received_bytes = 0;
    let total_bytes = 0;

    let req = this.electronService.request({
      method: 'GET',
      uri: file_url
    });

    let out = this.electronService.fs.createWriteStream(`/Users/elheche/Downloads/Test/${fileName}`);
    req.pipe(out);

    req.on('response', (data) => {
      total_bytes = parseInt(data.headers['content-length']);
    });

    req.on('data', (chunk) => {
      received_bytes += chunk.length;
      this.downloadProgress.next({ fileName: fileName, downloadPercentage: (received_bytes * 100) / total_bytes });
      console.log((received_bytes * 100) / total_bytes + "% | " + received_bytes + " bytes out of " + total_bytes + " bytes.");
    });

    req.on('end', () => {
      console.log("File succesfully downloaded");
    });
  }
}
