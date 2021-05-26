import {Component, OnDestroy, OnInit} from "@angular/core";
import {IProject, ISyncProject} from "../../shared/interfaces/project";
import {SyncService} from "../../services/sync/sync.service";
import {Subject, Subscription} from "rxjs";
import {ElectronService} from "../../core/services";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {ISyncFile} from "../../shared/interfaces/file";

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
  remoteProjects: Array<IProject>;
  localProjects: Array<IProject>;
  syncProjects: Array<ISyncProject>;
  syncProjects$: Subject<Array<ISyncProject>>;
  expandedSyncProject: ISyncProject | null;

  constructor(private syncService: SyncService,
              private electronService: ElectronService) {
  }

  ngOnInit(): void {
    this.initialize();
  }

  initialize(): void {
    this.subscriptions = new Array<Subscription>();
    this.displayedProjectColumns = ['project', 'creation date', 'sync state'];
    this.displayedFileColumns =['file', 'file creation date', 'file sync state'];
    this.remoteProjects = new Array<IProject>();
    this.localProjects = new Array<IProject>();
    this.syncProjects = new Array<ISyncProject>();
    this.syncProjects$ = new Subject<Array<ISyncProject>>();

    this.subscriptions.push(
      this.syncService.localProjects$.subscribe((projects) => {
        this.localProjects = projects;
        this.getRemoteProjects();
      })
    );

    this.subscriptions.push(
      this.syncService.remoteProjects$.subscribe((projects) => {
        this.remoteProjects = projects;
        this.synchronizeProjects();
      })
    );

    this.subscriptions.push(
      this.syncProjects$.subscribe((projects) => {
        this.syncProjects = projects;
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
          const directoryPath = directory.filePaths[0];
          await this.syncService.getLocalProjects(directoryPath);
        }
      })
      .catch(error => console.log((error)));
  }

  synchronizeProjects(): void {
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
    });

    this.syncProjects$.next(projects);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
