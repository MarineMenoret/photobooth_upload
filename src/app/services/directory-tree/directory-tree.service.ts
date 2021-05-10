import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ElectronService } from '../../core/services/electron/electron.service';
import { StorageService } from '../../services/storage/storage.service';

@Injectable({
  providedIn: 'root'
})
export class DirectoryTreeService implements OnDestroy {

  fs: any;
  path: any;
  directoryPath: string;
  directory: string;
  fileNames: Array<string>;
  filePaths: Array<string>;
  fileNames$: Subject<Array<string>>;
  directoryTree: Object;
  numberOfFilesUploaded: number;
  uploadTasks: Array<any>;;
  uploadPercentage: Object;
  getUploadPercentageSub: Array<Subscription>;
  getUploadStatusSub: Array<Subscription>;
  uploadFinalized$: Subject<boolean> = new Subject();
  uploadStatusMsg$: Subject<string> = new Subject();;
  uploadCanceled: boolean;
  isReadyToUpload: Subject<boolean>;
  downloadSubscriptions: Array<Subscription>;

  constructor(
    private electronService: ElectronService,
    private storageService: StorageService
  ) {
    this.fs = this.electronService.fs;
    this.path = this.electronService.path;
    this.initialize();
  }

  initialize() {
    this.directory = '';
    this.fileNames = [];
    this.filePaths = [];
    this.fileNames$ = new Subject();
    this.directoryTree = {};
    this.numberOfFilesUploaded = 0;
    this.uploadTasks = [];
    this.uploadPercentage = {};
    this.getUploadPercentageSub = [];
    this.getUploadStatusSub = [];
    this.uploadFinalized$.next(false);
    this.uploadStatusMsg$.next('');
    this.uploadCanceled = false;
    this.isReadyToUpload = new Subject<boolean>();
    this.downloadSubscriptions = new Array<Subscription>();
  }

  setDirectoryPath(directoryPath) {
    this.directoryPath = directoryPath;
    this.directory = directoryPath.split('/').pop();
    this.directoryTree = this.buildTree(directoryPath);
    this.fileNames$.next(this.fileNames);
    return this.directoryTree
  }

  getFileNames() {
    return this.fileNames;
  }

  buildTree(elementPath) {
    let result = {};
    let elementName = elementPath.split("/").pop();

    if (this.fs.lstatSync(elementPath).isDirectory()) {
      let childElements = this.fs.readdirSync(elementPath);
      result["name"] = elementName;
      for (let i = 0; i < childElements.length; i++) {
        let childElementPath = this.path.join(elementPath, childElements[i]);
        let childResult = this.buildTree(childElementPath);
        if (!result["children"]) {
          result["children"] = [];
        }
        result["children"].push(childResult);
      }
    } else {
      result["name"] = elementName;
      result["path"] = elementPath;
      this.fileNames.push(elementName);
      this.filePaths.push(elementPath.substring(elementPath.indexOf(this.directory)));
    }
    return result;
  }

  uploadDirectoryContent(directoryTree) {
    const isReadyToUploadSubscription = this.isReadyToUpload.subscribe((isReady) => {
      if (isReady) {
        this.uploadTreeNode([directoryTree]);
      }
    });
    this.uploadFilePaths();
    this.downloadSubscriptions.push(isReadyToUploadSubscription);
  }

  uploadTreeNode(element) {
    for (let i = 0; i < element.length; i++) {
      if (element[i].path) {
        this.uploadFile(element[i].path);
      }

      if (element[i].children) {
        this.uploadTreeNode(element[i].children);
      }
    }
  }

  uploadFile(path) {
    const file = this.fs.readFileSync(path);
    const fileName = path.split('/').pop();
    const fileExtension = path.split('.').pop()
    const relativePath = path.substring(path.indexOf(this.directory));

    let task = this.storageService.uploadFile(relativePath, file, fileExtension);
    this.uploadTasks.push(task);

    this.getUploadPercentageSub.push(
      task.percentageChanges()
        .subscribe(uploadPercentage => {
          this.uploadPercentage[fileName] = uploadPercentage;
        })
    )


    this.getUploadStatusSub.push(
      task.snapshotChanges().pipe(
        finalize(() => {
          this.numberOfFilesUploaded++;
          if (this.numberOfFilesUploaded === this.fileNames.length) {
            this.uploadFinalized$.next(true);
            this.uploadStatusMsg$.next('Files successfully uploaded.');
            if (this.uploadCanceled) this.uploadStatusMsg$.next("Upload canceled.");
          }
        })
      ).subscribe(
        res => { }, err => {
          this.uploadStatusMsg$.next('Error during files upload. Please retry.');
        }
      )
    )
  }

  cancelUpload() {
    for (let i = 0; i < this.uploadTasks.length; i++) {
      //if !complete :
      this.uploadTasks[i].cancel();
    } //else : remove files from storage...
    this.uploadCanceled = true;
    return this.uploadCanceled;
  }

  getUploadPercentage() {
    return this.uploadPercentage;
  }


  getUploadStatus() {
    return {
      uploadFinalized: this.uploadFinalized$,
      uploadStatusMsg: this.uploadStatusMsg$
    }
  }

  saveFilePaths(directory: string): void {
    const path = this.path.join(directory, 'file_paths.txt');
    const stream = this.electronService.fs.createWriteStream(path, { flags: 'a' });
    this.filePaths.forEach(filePath => { stream.write(filePath.concat('\n')) });
    stream.end();
  }

  uploadFilePaths(): void {
    const path = this.path.join(this.directoryPath, 'file_paths.txt');
    const file = this.fs.readFileSync(path);
    const relativePath = path.substring(path.indexOf(this.directory));

    let task = this.storageService.uploadFile(relativePath, file, 'txt');
    this.uploadTasks.push(task);

    const snapshotChangesSubsription = task.snapshotChanges().subscribe(
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => { console.log(error) },
      () => {
        this.isReadyToUpload.next(true);
        console.log('File paths successfully uploaded.');
      }
    );
    this.downloadSubscriptions.push(snapshotChangesSubsription);
  }

  ngOnDestroy() {
    if (this.getUploadPercentageSub.length > 0) {
      for (let i = 0; i < this.getUploadPercentageSub.length; i++) {
        this.getUploadPercentageSub[i].unsubscribe();
      }
    }

    if (this.getUploadStatusSub.length > 0) {
      for (let i = 0; i < this.getUploadStatusSub.length; i++) {
        this.getUploadStatusSub[i].unsubscribe();
      }
    }

    this.downloadSubscriptions.forEach(subscription => subscription.unsubscribe);
  }
}
