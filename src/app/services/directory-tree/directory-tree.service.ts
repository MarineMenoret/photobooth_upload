import {Injectable, OnDestroy} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection, DocumentReference} from '@angular/fire/firestore';
import {Subject, Subscription} from 'rxjs';
import {finalize} from 'rxjs/operators';
import {ElectronService} from '../../core/services';
import {StorageService} from '../storage/storage.service';
import {IDirectoryTree} from '../../shared/interfaces/directory-tree';
import {IProject} from '../../shared/interfaces/project';
import * as fs from 'fs';
import * as path from 'path';
import {IFile} from '../../shared/interfaces/file';
import firebase from "firebase";
import Timestamp = firebase.firestore.Timestamp;

@Injectable({
  providedIn: 'root'
})
export class DirectoryTreeService implements OnDestroy {

  fs: typeof fs;
  path: typeof path;
  directoryPath: string;
  directory: string;
  files: Array<IFile>;
  directoryTree: IDirectoryTree;
  numberOfFilesUploaded: number;
  uploadTasks: Array<any>;
  uploadPercentage: Object;
  getUploadPercentageSub: Array<Subscription>;
  getUploadStatusSub: Array<Subscription>;
  uploadFinalized$: Subject<boolean> = new Subject();
  uploadStatusMsg$: Subject<string> = new Subject();
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
    this.files = new Array<IFile>();
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

  async setDirectoryPath(directoryPath: string): Promise<IDirectoryTree> {
    this.directoryPath = directoryPath;
    this.directory = this.path.basename(directoryPath);
    this.directoryTree = await this.buildTree(directoryPath);
    return this.directoryTree;
  }

  getFileNames(): Array<string> {
    const fileNames = new Array<string>();
    this.files.forEach(file => fileNames.push(file.name));
    return fileNames;
  }

  getFiles(): Array<IFile> {
    return this.files;
  }

  async buildTree(elementPath: string): Promise<IDirectoryTree> {
    const result = {} as IDirectoryTree;
    const elementName = this.path.basename(elementPath);

    if (this.fs.lstatSync(elementPath).isDirectory()) {
      const childElements = this.fs.readdirSync(elementPath);
      result["name"] = elementName;
      for (let i = 0; i < childElements.length; i++) {
        const childElementPath = this.path.join(elementPath, childElements[i]);
        const childResult = await this.buildTree(childElementPath);
        if (!result["children"]) {
          result["children"] = [];
        }
        result["children"].push(childResult);
      }
    } else {
      result["name"] = elementName;
      result["path"] = elementPath;

      const file: IFile = {
        name: elementName,
        creationDate: Timestamp.fromDate(this.fs.statSync(elementPath).birthtime),
        path: this.findRelativePath(elementPath),
        size: this.fs.statSync(elementPath).size,
        sha256: await this.hashfile(elementPath)
      };
      this.files.push(file);
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

  findRelativePath(absolutePath: string): string {
    const pathSegments = absolutePath.split(this.path.sep);
    const relativePathSegments = pathSegments.slice(pathSegments.indexOf(this.directory));
    return this.path.join(...relativePathSegments);
  }

  uploadFile(path: string): void {
    const file = this.fs.readFileSync(path);
    const fileExtension = this.path.extname(path);
    const fileName = this.path.basename(path);
    const absolutePath = path.substring(path.indexOf(this.directory));
    const relativePath = this.findRelativePath(absolutePath);

    const task = this.storageService.uploadFile(relativePath, file, fileExtension);
    this.uploadTasks.push(task);

    this.getUploadPercentageSub.push(
      task.percentageChanges()
        .subscribe(uploadPercentage => {
          this.uploadPercentage[fileName] = uploadPercentage;
        })
    );


    this.getUploadStatusSub.push(
      task.snapshotChanges().pipe(
        finalize(() => {
          this.numberOfFilesUploaded++;
          if (this.numberOfFilesUploaded === this.files.length) {
            this.uploadFinalized$.next(true);
            this.uploadStatusMsg$.next('Files successfully uploaded.');
            if (this.uploadCanceled) this.uploadStatusMsg$.next("Upload canceled.");
          }
        })
      ).subscribe(
        res => {
        }, err => {
          this.uploadStatusMsg$.next('Error during files upload. Please retry.');
        }
      )
    );
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
    };
  }

  buildRelativeTree(directoryTree: IDirectoryTree): IDirectoryTree {
    if (directoryTree.path) {
      directoryTree.path = this.findRelativePath(directoryTree.path);
      return directoryTree;
    } else {
      directoryTree.children?.forEach((child: IDirectoryTree) => this.buildRelativeTree(child));
      return directoryTree;
    }
  }

  saveProjectStructure(directoryTree: IDirectoryTree): Promise<DocumentReference<IProject>> {
    // Deep copy to prevent modification of the current directory tree.
    const directoryTreeClone = JSON.parse(JSON.stringify(directoryTree));

    const relativeDirectoryTree = this.buildRelativeTree(directoryTreeClone);

    const project: IProject = {
      name: directoryTree.name,
      creationDate: Timestamp.fromDate(this.electronService.fs.lstatSync(this.directoryPath).birthtime),
      directoryTree: relativeDirectoryTree,
      files: this.files
    };

    return this.projectsCollection.add(project);
  }

  hashfile(path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const sha256Hash = this.electronService.crypto.createHash('sha256');
      const stream = this.electronService.fs.createReadStream(path);

      stream.on('data', (data) => {
        sha256Hash.update(data);
      });
      stream.on('end', () => {
        resolve(sha256Hash.digest('hex'));
      });
      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  ngOnDestroy(): void {
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
