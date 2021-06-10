import {Injectable} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from "@angular/fire/firestore";
import {IProject, ISyncProject} from "../../shared/interfaces/project";
import {Observable, Subject, Subscription} from "rxjs";
import firebase from "firebase";
import Timestamp = firebase.firestore.Timestamp;
import {ElectronService} from "../../core/services";
import {DirectoryTreeService} from "../directory-tree/directory-tree.service";
import {AngularFireStorage} from "@angular/fire/storage";
import TaskState = firebase.storage.TaskState;
import {IDirectoryTree} from "../../shared/interfaces/directory-tree";
import {IFile, ISyncFile} from "../../shared/interfaces/file";
import {DialogData} from "../../shared/interfaces/dialog-data";
import {MatDialog} from "@angular/material/dialog";
import {SyncDialogComponent} from "../../components/sync-dialog/sync-dialog.component";
import {MatSnackBar} from "@angular/material/snack-bar";


@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private subscriptions: Array<Subscription>;
  private projectsCollection: AngularFirestoreCollection<IProject>;
  private projectsDirectory: string;
  private remoteProjects: Array<IProject>;
  private remoteProjects$: Subject<Array<IProject>>;
  private localProjects: Array<IProject>;
  private localProjects$: Subject<Array<IProject>>;
  private syncProjects$: Subject<Array<ISyncProject>>;

  constructor(private afs: AngularFirestore,
              private storage: AngularFireStorage,
              private electronService: ElectronService,
              private directoryTreeService: DirectoryTreeService,
              private dialog: MatDialog,
              private snackBar: MatSnackBar) {
    this.initialize();
  }

  initialize(): void {
    this.subscriptions = new Array<Subscription>();
    this.projectsCollection = this.afs.collection<IProject>('projects');
    this.projectsDirectory = "";
    this.remoteProjects = new Array<IProject>();
    this.remoteProjects$ = new Subject<Array<IProject>>();
    this.localProjects = new Array<IProject>();
    this.localProjects$ = new Subject<Array<IProject>>();
    this.syncProjects$ = new Subject<Array<ISyncProject>>();

    this.subscriptions.push(
      this.localProjects$.subscribe((projects) => {
        this.localProjects = projects;
        this.getRemoteProjects();
      })
    );

    this.subscriptions.push(
      this.remoteProjects$.subscribe((projects) => {
        this.remoteProjects = projects;
        this.compareProjects();
      })
    );
  }

  notifySyncProjects(): Subject<Array<ISyncProject>> {
    return this.syncProjects$;
  }

  async getSyncProjects(directoryPath: string): Promise<void> {
    this.projectsDirectory = directoryPath;
    await this.getLocalProjects(directoryPath);
  }

  private async getLocalProjects(directoryPath: string): Promise<void> {
    const projects = new Array<IProject>();

    const directoryChildren = this.electronService.fs.readdirSync(directoryPath);

    for (const child of directoryChildren) {
      const childPath = this.electronService.path.join(directoryPath, child);

      if (this.electronService.fs.lstatSync(childPath).isDirectory()) {
        this.directoryTreeService.initialize();
        this.directoryTreeService.directory = child;

        const project: IProject = {
          name: child,
          creationDate: Timestamp.fromDate(this.electronService.fs.lstatSync(childPath).birthtime),
          directoryTree: this.directoryTreeService.buildRelativeTree(await this.directoryTreeService.buildTree(childPath)),
          files: this.directoryTreeService.getFiles()
        };

        projects.push(project);
      }
    }

    this.localProjects$.next(projects);
  }

  public async getChildrenDirPath(parentDirectoryPath: string) {
    const directoryChildren = this.electronService.fs.readdirSync(parentDirectoryPath);
    let childrenDirData = {};

    for (const child of directoryChildren) {
      const childPath = this.electronService.path.join(parentDirectoryPath, child);
      childrenDirData[child] = childPath;
    }

    return childrenDirData;
  }

  private getRemoteProjects(): void {
    const projects = new Array<IProject>();
    const projectsSubscription = this.projectsCollection.get()
      .subscribe(
        (querySnapshot) => {
          querySnapshot.forEach(doc => projects.push(doc.data()));
          this.remoteProjects$.next(projects);
        },
        (error) => {
          console.log(error);
        },
        () => {
          console.log('The list of remote projects downloaded successfully.');
          projectsSubscription.unsubscribe();
        }
      );
  }

  private compareProjects(): void {
    const projects = new Array<ISyncProject>();

    this.remoteProjects.forEach((remoteProject) => {
      const localProjectIndex = this.localProjects.findIndex(localProject => localProject.name == remoteProject.name);

      if (localProjectIndex == -1) {
        projects.push(
          {
            name: remoteProject.name,
            creationDate: remoteProject.creationDate,
            directoryTree: remoteProject.directoryTree,
            files: remoteProject.files.map(file => {
              return {
                ...file,
                sync: 'cloud'
              };
            }),
            sync: 'cloud'
          }
        );
      } else {
        const files = new Array<ISyncFile>();

        remoteProject.files.forEach((remoteFile) => {
          const localFileIndex = this.localProjects[localProjectIndex].files
            .findIndex(localFile => localFile.name == remoteFile.name && localFile.path == remoteFile.path);

          if (localFileIndex == -1) {
            files.push(
              {
                ...remoteFile,
                sync: 'cloud'
              }
            );
          } else {
            if (remoteFile.sha256 == this.localProjects[localProjectIndex].files[localFileIndex].sha256) {
              files.push(
                {
                  ...remoteFile,
                  sync: 'synchronized'
                }
              );
            } else {
              files.push(
                {
                  ...remoteFile,
                  sync: 'unsynchronized'
                }
              );
            }
          }
        });

        projects.push({
          ...remoteProject,
          files: files,
          sync: null
        });
      }
    });

    this.localProjects.forEach(localProject => {
      const remoteProjectIndex = this.remoteProjects.findIndex(remoteProject => remoteProject.name == localProject.name);

      if (remoteProjectIndex == -1) {
        projects.push(
          {
            name: localProject.name,
            creationDate: localProject.creationDate,
            directoryTree: localProject.directoryTree,
            files: localProject.files.map(file => {
              return {
                ...file,
                sync: 'local'
              };
            }),
            sync: 'local'
          }
        );
      } else {
        localProject.files.forEach((localFile) => {
          const remoteFileIndex = this.remoteProjects[remoteProjectIndex].files
            .findIndex(remoteFile => remoteFile.name == localFile.name && remoteFile.path == localFile.path);

          if (remoteFileIndex == -1) {
            projects.find(syncProject => syncProject.name == localProject.name).files
              .push({
                ...localFile,
                sync: 'local'
              });
          }
        });
      }
    });

    projects.forEach(syncProject => {
      if (syncProject.sync == null) {
        SyncService.updateProjectSynchronizationState(syncProject);
      }
    });

    this.syncProjects$.next(projects);
  }

  syncProject(project: ISyncProject, event: MouseEvent): void {
    // Prevent project expansion / collapse when we click on a sync icon.
    event.stopPropagation();

    const dialogData: DialogData = {
      title: "Project synchronization",
      content: `You are about to synchronize the entire "${project.name}" project. Do you want to continue?`,
      action: "Synchronize"
    };

    this.openDialog(dialogData).toPromise()
      .then(async userAction => {
        if (userAction) {
          try {
            await this.downloadFiles(project, project.files.filter(file => file.sync == 'cloud'));
            await this.uploadFiles(project, project.files.filter(file => file.sync == 'local'));
            if (project.sync == 'unsynchronized') {
              this.showSnackBar('Some synchronization conflicts have been detected, you must resolve them manually.');
            }
          } catch (error) {
            console.log(error);
          }
        }
      })
      .catch(error => console.log(error));
  }

  downloadProject(project: ISyncProject, event: MouseEvent): void {
    // Prevent project expansion / collapse when we click on a sync icon.
    event.stopPropagation();

    const dialogData: DialogData = {
      title: "Project download",
      content: `You are about to download the entire "${project.name}" project. Do you want to continue?`,
      action: "Download"
    };

    this.openDialog(dialogData).toPromise()
      .then(async userAction => {
        if (userAction) {
          try {
            await this.downloadFiles(project, project.files);
          } catch (error) {
            console.log(error);
          }
        }
      })
      .catch(error => console.log(error));
  }

  uploadProject(project: ISyncProject, event: MouseEvent): void {
    // Prevent project expansion / collapse when we click on a sync icon.
    event.stopPropagation();

    const dialogData: DialogData = {
      title: "Project upload",
      content: `You are about to upload the entire "${project.name}" project. Do you want to continue?`,
      action: "Upload"
    };

    this.openDialog(dialogData).toPromise()
      .then(async userAction => {
        if (userAction) {
          try {
            await this.uploadFiles(project, project.files);
          } catch (error) {
            console.log(error);
          }
        }
      })
      .catch(error => console.log(error));
  }

  syncFile(project: ISyncProject, file: ISyncFile): void {
    const remoteFile = this.remoteProjects
      .find(remoteProject => remoteProject.name == project.name).files
      .find(remoteFile => remoteFile.name == file.name);

    const localFile = this.localProjects
      .find(localProject => localProject.name == project.name).files
      .find(localFile => localFile.name == file.name);

    const conflictingFiles = [
      `Server version: ${remoteFile.name} ; created: ${remoteFile.creationDate.toDate().toLocaleDateString()} at ${remoteFile.creationDate.toDate().toLocaleTimeString()}`,
      `Local version: ${localFile.name} ; created: ${localFile.creationDate.toDate().toLocaleDateString()} at ${localFile.creationDate.toDate().toLocaleTimeString()}`
    ];

    const dialogData: DialogData = {
      title: "File synchronization",
      content: "A synchronization conflict is detected. You must resolve it manually by choosing the version of the file to keep.",
      action: "Synchronize",
      conflictingFiles: conflictingFiles
    };

    this.openDialog(dialogData).toPromise()
      .then(async userAction => {
        if (userAction) {
          if (conflictingFiles.indexOf(userAction as string) == 0) {
            try {
              file.creationDate = remoteFile.creationDate;
              file.size = remoteFile.size;
              file.sha256 = remoteFile.sha256;
              await this.downloadFiles(project, [file], true);
            } catch (error) {
              console.log(error);
            }
          } else {
            try {
              file.creationDate = localFile.creationDate;
              file.size = localFile.size;
              file.sha256 = localFile.sha256;
              await this.uploadFiles(project, [file], true);
            } catch (error) {
              console.log(error);
            }
          }
        }
      })
      .catch(error => console.log(error));
  }

  async uploadFiles(project: ISyncProject, files: Array<ISyncFile>, areConflictingFiles?: boolean): Promise<void> {
    project.sync = 'isSynchronizing';
    files.forEach(file => file.sync = 'isSynchronizing');

    for (const file of files) {
      try {
        const fileToUpload: IFile = {
          name: file.name,
          creationDate: file.creationDate,
          path: file.path,
          size: file.size,
          sha256: file.sha256
        };

        await this.uploadFile(this.projectsDirectory, fileToUpload, areConflictingFiles);
        file.sync = 'synchronized';
      } catch (error) {
        areConflictingFiles
          ? file.sync = 'unsynchronized'
          : file.sync = 'local';
        this.showSnackBar(`Error: the upload of the file "${file.name}" failed!`);
        console.log(error);
      }
    }
    SyncService.updateProjectSynchronizationState(project);
  }

  private uploadFile(projectsDirectory: string, file: IFile, isConflictingFile?: boolean): Promise<void> {
    const fullPath = this.electronService.path.join(projectsDirectory, file.path);

    return new Promise<void>((resolve, reject) => {
      this.electronService.fs.readFile(fullPath, (error, data) => {
        if (error) {
          reject(error);
        } else {
          this.storage.upload(file.path, data)
            .then(uploadTaskSnapShot => {
              switch (uploadTaskSnapShot.state) {
                case TaskState.SUCCESS:
                  this.updateProjectStructure(projectsDirectory, file, isConflictingFile)
                    .then(() => resolve())
                    .catch(error => reject(error));
                  break;
                case TaskState.ERROR:
                  reject(new Error(`The upload of the file "${file.name}" failed!`));
                  break;
              }
            })
            .catch((error) => reject(error));
        }
      });
    });
  }

  private updateProjectStructure(projectsDirectory: string, file: IFile, isConflictingFile?: boolean): Promise<void> {
    const normalizedFilePath = this.electronService.path.normalize(file.path);
    const pathSegments = normalizedFilePath.split(this.electronService.path.sep);
    const projectName = pathSegments[0];
    const projectPath = this.electronService.path.join(projectsDirectory, projectName);
    return new Promise<void>((resolve, reject) => {
      this.projectsCollection.ref.where('name', '==', projectName).get()
        .then((querySnapshot) => {
          if (querySnapshot.empty) {
            const project: IProject = {
              name: projectName,
              creationDate: Timestamp.fromDate(this.electronService.fs.lstatSync(projectPath).birthtime),
              directoryTree: {name: projectName},
              files: []
            };

            this.projectsCollection.add(project)
              .then((projectRef) => {
                console.log(`New project structure has been successfully created with ID: ${projectRef.id}`);
                this.updateProjectStructure(projectsDirectory, file)
                  .then(() => resolve())
                  .catch(error => reject(error));
              })
              .catch(error => reject(error));
          } else if (querySnapshot.size == 1) {
            const updatedDirectoryTree = querySnapshot.docs[0].data().directoryTree;
            const updatedFiles = querySnapshot.docs[0].data().files;

            if (isConflictingFile) {
              const index = updatedFiles.findIndex(updatedFile => updatedFile.name == file.name && updatedFile.path == file.path);

              if (index !== -1) {
                updatedFiles[index] = file;
              }
            } else {
              this.updateDirectoryTree(updatedDirectoryTree, pathSegments, file.path);
              updatedFiles.push(file);
            }

            querySnapshot.docs[0].ref.update(
              {
                directoryTree: updatedDirectoryTree,
                files: updatedFiles
              })
              .then(() => {
                console.log('The project structure has been successfully updated!');
                resolve();
              })
              .catch(error => reject(error));
          } else {
            reject(new Error('Several projects with the same name were found!'));
          }
        })
        .catch(error => reject(error));
    });
  }

  private updateDirectoryTree(directoryTree: IDirectoryTree, pathSegments: Array<string>, filePath: string): void {
    pathSegments = pathSegments.slice(1);

    if (pathSegments.length == 1) {
      directoryTree.children
        ? directoryTree.children.push({name: pathSegments[0], path: filePath})
        : directoryTree.children = new Array<IDirectoryTree>({name: pathSegments[0], path: filePath});
    } else if (pathSegments.length > 1) {
      const childDirectoryIndex = directoryTree.children?.findIndex(child => child.name == pathSegments[0]);

      if (childDirectoryIndex == undefined) {
        directoryTree.children = new Array<IDirectoryTree>({name: pathSegments[0]});
        this.updateDirectoryTree(directoryTree.children[directoryTree.children.length - 1], pathSegments, filePath);
      } else if (childDirectoryIndex == -1) {
        directoryTree.children.push({name: pathSegments[0],});
        this.updateDirectoryTree(directoryTree.children[directoryTree.children.length - 1], pathSegments, filePath);
      } else {
        this.updateDirectoryTree(directoryTree.children[childDirectoryIndex], pathSegments, filePath);
      }
    }
  }

  async downloadFiles(project: ISyncProject, files: Array<ISyncFile>, areConflictingFiles?: boolean): Promise<void> {
    project.sync = 'isSynchronizing';
    files.forEach(file => file.sync = 'isSynchronizing');

    for (const file of files) {
      try {
        await this.downloadFile(this.projectsDirectory, file);
        file.sync = 'synchronized';
      } catch (error) {
        areConflictingFiles
          ? file.sync = 'unsynchronized'
          : file.sync = 'cloud';
        this.showSnackBar(`Error: the download of the file "${file.name}" failed!`);
        console.log(error);
      }
    }
    SyncService.updateProjectSynchronizationState(project);
  }

  private downloadFile(projectsDirectory: string, file: IFile): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.storage.ref(file.path).getDownloadURL().toPromise()
        .then((url) => {
          const fileFullPath = this.electronService.path.join(projectsDirectory, file.path);
          const fileDirectory = this.electronService.path.dirname(fileFullPath);

          // Create a folder recursively if it does not exist..
          try {
            if (!this.electronService.fs.existsSync(fileDirectory)) {
              this.electronService.fs.mkdirSync(fileDirectory, {recursive: true});
            }
          } catch (error) {
            reject(error);
            return;
          }

          const req = this.electronService.request({
            method: 'GET',
            uri: url
          });

          const out = this.electronService.fs.createWriteStream(fileFullPath);
          req.pipe(out);

          req.on('end', () => {
            resolve();
            console.log(`"${file.name}" file successfully downloaded`);
          });

          req.on('error', (error) => reject(error));
        })
        .catch(error => reject(error));
    });
  }

  private static updateProjectSynchronizationState(syncProject: ISyncProject): void {
    if (syncProject.files.every(file => file.sync == 'synchronized')) {
      syncProject.sync = 'synchronized';
    } else if (syncProject.files.every(file => file.sync == 'cloud')) {
      syncProject.sync = 'cloud';
    } else if (syncProject.files.every(file => file.sync == 'local')) {
      syncProject.sync = 'local';
    } else {
      syncProject.sync = 'unsynchronized';
    }
  }

  private openDialog(data: DialogData): Observable<any> {
    const dialogRef = this.dialog.open(SyncDialogComponent, {data: data});
    return dialogRef.afterClosed();
  }

  showSnackBar(message: string, event?: MouseEvent): void {
    // Prevent project expansion / collapse when we click on a sync icon.
    if (event) {
      event.stopPropagation();
    }

    this.snackBar.open(message, null, {duration: 2000});
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
