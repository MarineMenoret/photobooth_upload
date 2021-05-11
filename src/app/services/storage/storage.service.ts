import { Injectable } from "@angular/core";
import { AngularFireStorage } from "@angular/fire/storage";
import { ListResult, Reference } from "@angular/fire/storage/interfaces";
import { Observable, Subject, Subscription } from "rxjs";
import { AppConfig } from "../../../environments/environment";
import { ElectronService } from "../../core/services/electron/electron.service";

@Injectable({
  providedIn: "root",
})
export class StorageService {
  filePaths: Subject<string>;
  fileNames: Subject<Array<string>>;
  subscriptions: Array<Subscription>;

  constructor(private storage: AngularFireStorage, private electronService: ElectronService) {
    this.filePaths = new Subject<string>();
    this.fileNames = new Subject<Array<string>>();
    this.subscriptions = new Array<Subscription>();

    const subscription = this.filePaths.subscribe((path) => {
      if (path) {
        this.getFileNames(path);
      }
    });

    this.subscriptions.push(subscription);
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

  getFilePaths(folder: Reference, path: string): void {
    path = this.electronService.path.join(path, 'file_paths.txt');
    folder.child('file_paths.txt').getDownloadURL()
      .then(url => this.downloadFile(url, path))
      .catch(error => console.log(error));
  }

  getFileNames(path: string): void {
    this.electronService.fs.readFile(path, (error, data) => {
      if (error) {
        console.log(error)
      } else {
        const paths = data.toString('utf-8').split('\n');

        let fileNames = Array<string>();

        paths.forEach((path) => {
          if (path) {
            fileNames.push(path.split('/').pop());
          }
        });

        this.fileNames.next(fileNames);
      }
    })
  }

  downloadFile(file_url: string, path: string): void {
    let received_bytes = 0;
    let total_bytes = 0;

    let req = this.electronService.request({
      method: 'GET',
      uri: file_url
    });

    let out = this.electronService.fs.createWriteStream(path);
    req.pipe(out);

    req.on('response', (data) => {
      total_bytes = parseInt(data.headers['content-length']);
    });

    req.on('data', (chunk) => {
      received_bytes += chunk.length;
      console.log((received_bytes * 100) / total_bytes + "% | " + received_bytes + " bytes out of " + total_bytes + " bytes.");
    });

    req.on('end', () => {
      this.filePaths.next(path);
      console.log("File succesfully downloaded");
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe);
  }
}
