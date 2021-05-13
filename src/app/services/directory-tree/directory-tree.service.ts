import { Injectable, OnDestroy } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentReference } from '@angular/fire/firestore';
import { Subject, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ElectronService } from '../../core/services/electron/electron.service';
import { StorageService } from '../../services/storage/storage.service';
import { IDirectoryTree } from '../../shared/interfaces/directory-tree';
import { IProject } from '../../shared/interfaces/project';
import * as fs from 'fs';
import * as path from 'path';
import { IFile } from '../../shared/interfaces/file';

@Injectable({
  providedIn: 'root'
})
export class DirectoryTreeService implements OnDestroy {

  fs: typeof fs;
  path: typeof path;
  directoryPath: string;
  directory: string;
  fileNames: Array<string>;
  filePaths: Array<string>;
  fileSizes: Array<number>;
  fileNames$: Subject<Array<string>>;
  directoryTree: IDirectoryTree;
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
    this.fileSizes = [];
    this.fileNames$ = new Subject();
    this.directoryTree = {} as IDirectoryTree;
    this.numberOfFilesUploaded = 0;
    this.uploadTasks = [];
    this.uploadPercentage = {};
    this.getUploadPercentageSub = [];
    this.getUploadStatusSub = [];
    this.uploadFinalized$.next(false);
    this.uploadStatusMsg$.next('');
    this.uploadCanceled = false;
  }

  setDirectoryPath(directoryPath: string): IDirectoryTree {
    this.directoryPath = directoryPath;
    this.directory = directoryPath.split('/').pop();
    this.directoryTree = this.buildTree(directoryPath);
    this.fileNames$.next(this.fileNames);
    return this.directoryTree
  }

  getFileNames(): Array<string> {
    return this.fileNames;
  }

  buildTree(elementPath: string): IDirectoryTree {
    let result = {} as IDirectoryTree;
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
      this.fileSizes.push(this.fs.statSync(elementPath).size);
    }
    return result;
  }

  uploadDirectoryContent(directoryTree: IDirectoryTree): void {
    this.saveProjectStructure(directoryTree)
      .then(_ => this.uploadTreeNode([directoryTree]))
      .catch(error => console.log(error));
  }

  uploadTreeNode(element: Array<IDirectoryTree>): void {
    for (let i = 0; i < element.length; i++) {
      if (element[i].path) {
        this.uploadFile(element[i].path);
      }

      if (element[i].children) {
        this.uploadTreeNode(element[i].children);
      }
    }
  }

  uploadFile(path: string): void {
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

  cancelUpload(): boolean {
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

  buildRelativeTree(directoryTree: IDirectoryTree, rootDirectory: string): IDirectoryTree {
    if (directoryTree.path) {
      directoryTree.path = directoryTree.path.substring(directoryTree.path.indexOf(rootDirectory));
      return directoryTree;
    } else {
      directoryTree.children.forEach((child: IDirectoryTree) => this.buildRelativeTree(child, rootDirectory));
      return directoryTree;
    }
  }

  saveProjectStructure(directoryTree: IDirectoryTree): Promise<DocumentReference<IProject>> {
    // Deep copy to prevent modification of the current directory tree.
    const directoryTreeClone = JSON.parse(JSON.stringify(directoryTree));

    const relativeDirectoryTree = this.buildRelativeTree(directoryTreeClone, this.directory);

    const files = Array<IFile>();

    this.fileNames.forEach((fileName, index) => {
      files.push({
        name: fileName,
        path: this.filePaths[index],
        size: this.fileSizes[index]
      });
    })

    const project: IProject = {
      name: directoryTree.name,
      creationDate: new Date(),
      directoryTree: relativeDirectoryTree,
      files: files
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
