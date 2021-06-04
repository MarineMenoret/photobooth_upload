import {Component, OnDestroy, OnInit} from "@angular/core";
import {IProject, ISyncProject} from "../../shared/interfaces/project";
import {SyncService} from "../../services/sync/sync.service";
import {Observable, Subject, Subscription} from "rxjs";
import {ElectronService} from "../../core/services";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {IFile, ISyncFile} from "../../shared/interfaces/file";
import {MatSnackBar} from "@angular/material/snack-bar";
import {MatDialog} from "@angular/material/dialog";
import {SyncDialogComponent} from "../sync-dialog/sync-dialog.component";
import {DialogData} from "../../shared/interfaces/dialog-data";

@Component({
  selector: "photoboothImport",
  templateUrl: "./photoboothImport.component.html",
  styleUrls: ["./photoboothImport.component.scss"],
  animations: [trigger('detailExpand', [
    state('collapsed', style({height: '0px', minHeight: '0'})),
    state('expanded', style({height: '*'})),
    transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
  ]),
  ],
})

export class PhotoboothImportComponent implements OnInit, OnDestroy {
  subscriptions: Array<Subscription>;
  displayedProjectColumns: Array<string>;
  displayedFileColumns: Array<string>;
  projectsDirectory: string;
  remoteProjects: Array<IProject>;
  localProjects: Array<IProject>;
  syncProjects: Array<ISyncProject>;
  syncProjects$: Subject<Array<ISyncProject>>;
  expandedSyncProject: ISyncProject | null;
  isLoading: boolean;

  constructor(private syncService: SyncService,
              private electronService: ElectronService,
              private snackBar: MatSnackBar,
              public dialog: MatDialog) {
  }

  ngOnInit(): void {
    this.initialize();
  }

  initialize(): void {
    this.subscriptions = new Array<Subscription>();
    this.displayedProjectColumns = ['project', 'creation date', 'sync state'];
    this.displayedFileColumns = ['file', 'file creation date', 'file sync state'];
    this.projectsDirectory = "";
    this.remoteProjects = new Array<IProject>();
    this.localProjects = new Array<IProject>();
    this.syncProjects = new Array<ISyncProject>();
    this.syncProjects$ = new Subject<Array<ISyncProject>>();
    this.isLoading = false;

    this.subscriptions.push(
      this.syncService.localProjects$.subscribe((projects) => {
        this.localProjects = projects;
        this.getRemoteProjects();
      })
    );

    this.subscriptions.push(
      this.syncService.remoteProjects$.subscribe((projects) => {
        this.remoteProjects = projects;
        this.compareProjects();
      })
    );

    this.subscriptions.push(
      this.syncProjects$.subscribe((projects) => {
        this.syncProjects = projects;
        this.isLoading = false;
      })
    );
  }

  getRemoteProjects(): void {
    this.syncService.getRemoteProjects();
  }

  getLocalProjects(): void {
    this.electronService.remote.dialog.showOpenDialog({
      title: "Select a folder to import projects into photobooth",
      buttonLabel: "Select",
      properties: ["openDirectory"],
    })
      .then(async directory => {
        if (!directory.canceled) {
          this.isLoading = true;
          this.projectsDirectory = directory.filePaths[0];
          await this.syncService.getLocalProjects(this.projectsDirectory);
        }
      })
      .catch(error => console.log((error)));
  }

  compareProjects(): void {
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
        this.updateProjectSynchronizationState(syncProject);
      }
    });

    this.syncProjects$.next(projects);
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

  async downloadFiles(project: ISyncProject, files: Array<ISyncFile>, areConflictingFiles?: boolean): Promise<void> {
    project.sync = 'isSynchronizing';
    files.forEach(file => file.sync = 'isSynchronizing');

    for (const file of files) {
      try {
        await this.syncService.downloadFile(this.projectsDirectory, file);
        file.sync = 'synchronized';
      } catch (error) {
        areConflictingFiles
          ? file.sync = 'unsynchronized'
          : file.sync = 'cloud';
        this.showSnackBar(`Error: the download of the file "${file.name}" failed!`);
        console.log(error);
      }
    }
    this.updateProjectSynchronizationState(project);
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

        await this.syncService.uploadFile(this.projectsDirectory, fileToUpload, areConflictingFiles);
        file.sync = 'synchronized';
      } catch (error) {
        areConflictingFiles
          ? file.sync = 'unsynchronized'
          : file.sync = 'local';
        this.showSnackBar(`Error: the upload of the file "${file.name}" failed!`);
        console.log(error);
      }
    }
    this.updateProjectSynchronizationState(project);
  }

  updateProjectSynchronizationState(syncProject: ISyncProject): void {
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

  showSnackBar(message: string, event?: MouseEvent): void {
    // Prevent project expansion / collapse when we click on a sync icon.
    if (event) {
      event.stopPropagation();
    }

    this.snackBar.open(message, null, {duration: 2000});
  }

  openDialog(data: DialogData): Observable<any> {
    const dialogRef = this.dialog.open(SyncDialogComponent, {data: data});
    return dialogRef.afterClosed();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
