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
  subscriptions: Array<Subscription>;
  filePaths: Subject<string>;
  fileNames: Array<string>;
  fileNamesNotification: Subject<Array<string>>;
  filesDownloadProgress: Array<number>;
  downloadProgressNotification: Subject<Array<number>>;
  projectDownloadIsSuccessful: Subject<boolean>;


  constructor(private storage: AngularFireStorage, private electronService: ElectronService) {
    this.subscriptions = new Array<Subscription>();
    this.filePaths = new Subject<string>();
    this.fileNames = new Array<string>();
    this.fileNamesNotification = new Subject<Array<string>>();
    this.filesDownloadProgress = new Array<number>();
    this.downloadProgressNotification = new Subject<Array<number>>();
    this.projectDownloadIsSuccessful = new Subject<boolean>();

    const filePathsSubscription = this.filePaths.subscribe((path) => {
      if (path) {
        this.getFileNames(path);
      }
    });

    this.subscriptions.push(filePathsSubscription);
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

  downloadProject(folder: Reference, path: string): void {
    this.fileNames.length = 0;
    this.filesDownloadProgress.length = 0;

    this.getFilePaths(folder, path);

    const fileNamesSubscription = this.fileNamesNotification.subscribe((files) => {
      if (files.length > 0) {
        this.fileNames = files;
        this.filesDownloadProgress = new Array<number>(files.length).fill(0);
        this.getFiles(folder, path);
        fileNamesSubscription.unsubscribe();
      }
    });
  }

  getFiles(folder: Reference, path: string): void {
    folder.listAll()
      .then((result) => {
        result.items.forEach((item) => {
          if (item.name != 'file_paths.txt') {
            const filePath = this.electronService.path.join(path, item.name);
            item.getDownloadURL()
              .then(url => this.downloadFile(url, filePath, true))
              .catch(error => console.log(error))
          }
        })

        result.prefixes.forEach((prefixe) => {
          this.getFiles(prefixe, path)
        })
      })
      .catch(error => console.log(error));
  }

  getFilePaths(folder: Reference, path: string): void {
    const filePath = this.electronService.path.join(path, 'file_paths.txt');
    folder.child('file_paths.txt').getDownloadURL()
      .then(url => this.downloadFile(url, filePath, false))
      .catch(error => console.log(error));
  }

  getFileNames(path: string): void {
    this.electronService.fs.readFile(path, (error, data) => {
      if (error) {
        console.log(error)
      } else {
        const paths = data.toString('utf-8').split('\n');

        const fileNames = Array<string>();

        paths.forEach((path) => {
          if (path) {
            fileNames.push(path.split('/').pop());
          }
        });

        this.fileNamesNotification.next(fileNames);
      }
    })
  }

  downloadFile(file_url: string, path: string, downloadProjectFiles: boolean): void {
    let received_bytes = 0;
    let total_bytes = 0;

    const fileIndex = this.fileNames.indexOf(path.split('/').pop());

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

      if (downloadProjectFiles) {
        this.filesDownloadProgress[fileIndex] = (received_bytes * 100) / total_bytes;
        this.downloadProgressNotification.next(this.filesDownloadProgress);
      }
    });

    req.on('end', () => {
      console.log("File succesfully downloaded");

      if (downloadProjectFiles) {
        let isCompleted = true;

        this.filesDownloadProgress.forEach((pourcentage) => {
          if (pourcentage != 100) {
            isCompleted = false;
          }
        });

        this.projectDownloadIsSuccessful.next(isCompleted);

      } else {
        this.filePaths.next(path);
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe);
  }
}
