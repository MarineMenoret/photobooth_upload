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

  synchronizeProject(project: ISyncProject, file?: ISyncFile, event?: MouseEvent): void {
    // Prevent project expansion / collapse when we click on a sync icon.
    if (event) {
      event.stopPropagation();
    }

    switch (project.sync) {
      case "local": {
        let dialogData: DialogData;

        if (file) {
          dialogData = {
            title: "File upload",
            content: `The "${project.name}" project does not yet exist in the cloud. This will upload the entire project. Do you want to continue?`,
            action: "Upload"
          };
        } else {
          dialogData = {
            title: "Project upload",
            content: `You are about to upload the entire "${project.name}" project. Do you want to continue?`,
            action: "Upload"
          };
        }

        const dialogSubscription = this.openDialog(dialogData)
          .subscribe(userAction => {
            if (userAction) {
              project.sync = 'isSynchronizing';
              project.files.forEach(file => file.sync = 'isSynchronizing');

              this.syncService.uploadProject(this.projectsDirectory, project)
                .then(() => {
                  project.sync = 'synchronized';
                  project.files.forEach(file => file.sync = 'synchronized');
                })
                .catch(error => {
                  project.sync = 'local';
                  project.files.forEach(file => file.sync = 'local');
                  this.showSnackBar('Error: Synchronisation failed, try again!');
                  console.log(error);
                });
            }
            dialogSubscription.unsubscribe();
          });
        break;
      }
      case "cloud": {
        let dialogData: DialogData;

        if (file) {
          dialogData = {
            title: "File download",
            content: `The "${project.name}" project does not yet exist locally. This will create it. Do you want to continue?`,
            action: "Download"
          };

          const dialogSubscription = this.openDialog(dialogData)
            .subscribe(userAction => {
              if (userAction) {
                file.sync = 'isSynchronizing';

                this.syncService.downloadFile(this.projectsDirectory, file)
                  .then(() => {
                    file.sync = 'synchronized';
                    this.updateProjectSynchronizationState(project);
                  })
                  .catch(error => {
                    file.sync = 'cloud';
                    this.showSnackBar('Error: Synchronisation failed, try again!');
                    console.log(error);
                  });
              }
              dialogSubscription.unsubscribe();
            });
        } else {
          dialogData = {
            title: "Project download",
            content: `You are about to download the entire "${project.name}" project. Do you want to continue?`,
            action: "Download"
          };

          this.openDialog(dialogData).toPromise()
            .then(async userAction => {
              if (userAction) {
                project.sync = 'isSynchronizing';
                project.files.forEach(file => file.sync = 'isSynchronizing');

                for (const file of project.files) {
                  try {
                    await this.syncService.downloadFile(this.projectsDirectory, file);
                    file.sync = 'synchronized';
                  } catch (error) {
                    file.sync = 'cloud';
                    this.showSnackBar(`The download of the file "${file.name}" failed!`);
                    console.log(error);
                  }
                }
                this.updateProjectSynchronizationState(project);
              }
            })
            .catch(error => console.log(error));
        }
        break;
      }
      case "unsynchronized": {
        if (file) {
          switch (file.sync) {
            case "local": {
              file.sync = 'isSynchronizing';

              const fileToUpload: IFile = {
                name: file.name,
                creationDate: file.creationDate,
                path: file.path,
                size: file.size,
                sha256: file.sha256
              };

              this.syncService.uploadFile(this.projectsDirectory, fileToUpload)
                .then(() => {
                  file.sync = 'synchronized';
                  this.updateProjectSynchronizationState(project);
                })
                .catch(error => {
                  file.sync = 'local';
                  this.showSnackBar('Error: Synchronisation failed, try again!');
                  console.log(error);
                });
              break;
            }
            case "cloud": {
              file.sync = 'isSynchronizing';

              this.syncService.downloadFile(this.projectsDirectory, file)
                .then(() => {
                  file.sync = 'synchronized';
                  this.updateProjectSynchronizationState(project);
                })
                .catch(error => {
                  file.sync = 'cloud';
                  this.showSnackBar('Error: Synchronisation failed, try again!');
                  console.log(error);
                });
              break;
            }
            case "unsynchronized": {
              const remoteFile = this.remoteProjects
                .find(remoteProject => remoteProject.name = project.name).files
                .find(remoteFile => remoteFile.name == file.name);

              const localFile = this.localProjects
                .find(localProject => localProject.name = project.name).files
                .find(localFile => localFile.name == file.name);

              const conflictingFiles = [
                `Server version: ${remoteFile.name} ; created: ${remoteFile.creationDate.toLocaleDateString()} at ${remoteFile.creationDate.toLocaleTimeString()}`,
                `Local version: ${localFile.name} ; created: ${localFile.creationDate.toLocaleDateString()} at ${localFile.creationDate.toLocaleTimeString()}`
              ];

              const dialogData: DialogData = {
                title: "Synchronization conflict",
                content: "A synchronization conflict is detected. You must resolve it manually by choosing the version of the file to keep.",
                action: "Synchronize",
                conflictingFiles: conflictingFiles
              };

              this.openDialog(dialogData).toPromise()
                .then(userAction => {
                  if (userAction) {
                    if (conflictingFiles.indexOf(userAction as unknown as string) == 0) {
                      file.sync = 'isSynchronizing';

                      this.syncService.downloadFile(this.projectsDirectory, remoteFile)
                        .then(() => {
                          file.creationDate = remoteFile.creationDate;
                          file.size = remoteFile.size;
                          file.sha256 = remoteFile.sha256;
                          file.sync = 'synchronized';
                          this.updateProjectSynchronizationState(project);
                        })
                        .catch(error => {
                          file.sync = 'unsynchronized';
                          this.showSnackBar('Error: Synchronisation failed, try again!');
                          console.log(error);
                        });
                    } else {
                      file.sync = 'isSynchronizing';

                      this.syncService.uploadFile(this.projectsDirectory, localFile, true)
                        .then(() => {
                          file.creationDate = localFile.creationDate;
                          file.size = localFile.size;
                          file.sha256 = localFile.sha256;
                          file.sync = 'synchronized';
                          this.updateProjectSynchronizationState(project);
                        })
                        .catch(error => {
                          file.sync = 'unsynchronized';
                          this.showSnackBar('Error: Synchronisation failed, try again!');
                          console.log(error);
                        });
                    }
                  }
                })
                .catch(error => console.log(error));
              break;
            }
            case "synchronized": {
              this.showSnackBar('This file is already synchronized.');
              break;
            }
            default: {
              this.showSnackBar("Synchronization not yet available.");
            }
          }
        } else {
          console.log("Project: unsynchronized");
        }
        break;
      }
      case "synchronized": {
        if (file) {
          this.showSnackBar('This file is already synchronized.');
        } else {
          this.showSnackBar('This project is already synchronized.');
        }
        break;
      }
      default: {
        this.showSnackBar("Synchronization not yet available.");
      }
    }
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

  showSnackBar(message: string): void {
    this.snackBar.open(message, null, {duration: 2000});
  }

  openDialog(data: DialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(SyncDialogComponent, {data: data});
    return dialogRef.afterClosed();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
