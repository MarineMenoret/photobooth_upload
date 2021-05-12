import { Injectable } from "@angular/core";
import { AngularFirestore, AngularFirestoreCollection } from "@angular/fire/firestore";
import { AngularFireStorage } from "@angular/fire/storage";
import { ListResult, Reference } from "@angular/fire/storage/interfaces";
import { Observable, Subject, Subscription } from "rxjs";
import { AppConfig } from "../../../environments/environment";
import { ElectronService } from "../../core/services/electron/electron.service";
import { IProject } from "../../shared/interfaces/project";

@Injectable({
  providedIn: "root",
})
export class StorageService {
  projectsCollection: AngularFirestoreCollection<IProject>;
  subscriptions: Array<Subscription>;
  filePaths: Array<string>;
  filePathsNotification: Subject<Array<string>>;
  fileNames: Array<string>;
  fileNamesNotification: Subject<Array<string>>;
  filesDownloadProgress: Array<number>;
  downloadProgressNotification: Subject<Array<number>>;
  projectDownloadIsSuccessful: Subject<boolean>;


  constructor(
    private storage: AngularFireStorage,
    private electronService: ElectronService,
    private afs: AngularFirestore
  ) {
    this.projectsCollection = this.afs.collection<IProject>('projects');
    this.subscriptions = new Array<Subscription>();
    this.filePaths = new Array<string>();
    this.filePathsNotification = new Subject<Array<string>>();
    this.fileNames = new Array<string>();
    this.fileNamesNotification = new Subject<Array<string>>();
    this.filesDownloadProgress = new Array<number>();
    this.downloadProgressNotification = new Subject<Array<number>>();
    this.projectDownloadIsSuccessful = new Subject<boolean>();

    const filePathsSubscription = this.filePathsNotification.subscribe((paths) => {
      if (paths) {
        this.filePaths = paths;
        this.getFileNames(paths);
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
    this.filePaths.length = 0;
    this.fileNames.length = 0;
    this.filesDownloadProgress.length = 0;

    const fileNamesSubscription = this.fileNamesNotification.subscribe((files) => {
      if (files.length > 0) {
        this.fileNames = files;
        this.filesDownloadProgress = new Array<number>(files.length).fill(0);
        this.getFiles(folder, path);
        fileNamesSubscription.unsubscribe();
      }
    });

    this.getFilePaths(folder);
  }

  getFiles(folder: Reference, path: string): void {
    folder.listAll()
      .then((result) => {
        result.items.forEach((item) => {
          const filePath = this.electronService.path.join(
            path,
            this.filePaths.find(filePath => filePath.includes(item.name))
          );
          item.getDownloadURL()
            .then(url => this.downloadFile(url, filePath, item.name))
            .catch(error => console.log(error))
        })

        result.prefixes.forEach((prefixe) => {
          this.getFiles(prefixe, path)
        })
      })
      .catch(error => console.log(error));
  }

  getFilePaths(folder: Reference): void {
    this.projectsCollection.ref.where('name', '==', folder.name)
      .get()
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          console.log("Project structure not found!")
        } else {
          this.filePathsNotification.next(querySnapshot.docs[0].data().filePaths)
        }
      })
      .catch((error) => {
        console.log("Error getting documents: ", error);
      });
  }

  getFileNames(paths: Array<string>): void {
    let fileNames = new Array<string>();

    paths.forEach((path) => {
      fileNames.push(path.split('/').pop());
    });

    this.fileNamesNotification.next(fileNames);
  }

  downloadFile(file_url: string, path: string, fileName: string): void {

    const directory = path.substring(0, path.indexOf(fileName) - 1);

    if (!this.electronService.fs.existsSync(directory)) {
      this.electronService.fs.mkdirSync(directory, { recursive: true });
    }

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

      this.filesDownloadProgress[fileIndex] = (received_bytes * 100) / total_bytes;
      this.downloadProgressNotification.next(this.filesDownloadProgress);

    });

    req.on('end', () => {
      console.log("File succesfully downloaded");

      if (this.filesDownloadProgress.every(pourcentage => pourcentage == 100)) {
        this.projectDownloadIsSuccessful.next(true);
      }

    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe);
  }
}
