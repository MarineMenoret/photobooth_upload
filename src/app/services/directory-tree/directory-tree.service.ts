import { Injectable, OnDestroy } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentReference } from '@angular/fire/firestore';
import { Subject, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ElectronService } from '../../core/services/electron/electron.service';
import { StorageService } from '../../services/storage/storage.service';
import { IProject } from '../../shared/interfaces/project';

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
  projectsCollection: AngularFirestoreCollection<IProject>;

  constructor(
    private electronService: ElectronService,
    private storageService: StorageService,
    private afs: AngularFirestore
  ) {
    this.fs = this.electronService.fs;
    this.path = this.electronService.path;
    this.projectsCollection = this.afs.collection<IProject>('projects');
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
    this.saveProjectStructure(directoryTree)
      .then(_ => this.uploadTreeNode([directoryTree]))
      .catch(error => console.log(error));
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

  buildRelativeTree(directoryTree: any, rootDirectory: string): any {
    if (directoryTree.path) {
      directoryTree.path = directoryTree.path.substring(directoryTree.path.indexOf(rootDirectory));
      return directoryTree;
    } else {
      directoryTree.children.forEach((child: any) => this.buildRelativeTree(child, rootDirectory));
      return directoryTree;
    }
  }

  saveProjectStructure(directoryTree: any): Promise<DocumentReference<IProject>> {
    // Deep copy to prevent modification of the current directory tree.
    const directoryTreeClone = JSON.parse(JSON.stringify(directoryTree));

    const relativeDirectoryTree = this.buildRelativeTree(directoryTreeClone, this.directory);

    const project: IProject = {
      name: directoryTree.name,
      creationDate: new Date(),
      filePaths: this.filePaths,
      directoryTree: relativeDirectoryTree
    }

    return this.projectsCollection.add(project);
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
  }
}
