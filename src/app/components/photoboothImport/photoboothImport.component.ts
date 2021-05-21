import {Component, OnDestroy, OnInit} from "@angular/core";
import {ISyncProject} from "../../shared/interfaces/project";
import {SyncService} from "../../services/sync/sync.service";
import {Subscription} from "rxjs";
import {ElectronService} from "../../core/services";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {DirectoryTreeService} from "../../services/directory-tree/directory-tree.service";

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
  displayedColumns: Array<string>;
  remoteProjects: Array<ISyncProject>;
  localProjects: Array<ISyncProject>;
  expandedRemoteProject: ISyncProject | null;
  expandedLocalProject: ISyncProject | null;

  constructor(private syncService: SyncService,
              private electronService: ElectronService,
              private directoryTreeService: DirectoryTreeService) {
  }

  ngOnInit(): void {
    this.initialize();
  }

  initialize(): void {
    this.subscriptions = new Array<Subscription>();
    this.displayedColumns = ['project', 'creation date', 'state'];
    this.remoteProjects = new Array<ISyncProject>();
    this.localProjects = new Array<ISyncProject>();

    this.subscriptions.push(
      this.syncService.remoteProjects$.subscribe((projects) => {
        this.remoteProjects = projects;
      })
    );
  }

  getRemoteProjects(): void {
    this.syncService.getRemoteProjects();
  }

  getLocalProjects(): void {
    const projects = new Array<ISyncProject>();

    this.electronService.remote.dialog.showOpenDialog({
      title: "Select a folder to import projects into photobooth",
      buttonLabel: "Select",
      properties: ["openDirectory"],
    })
      .then(async (directory) => {
        if (!directory.canceled) {
          const directoryPath = directory.filePaths[0];
          const directoryChild = this.electronService.fs.readdirSync(directoryPath);

          for (const child of directoryChild) {
            const childPath = this.electronService.path.join(directoryPath, child);

            if (this.electronService.fs.lstatSync(childPath).isDirectory()) {
              this.directoryTreeService.initialize();

              const project: ISyncProject = {
                name: child,
                creationDate: this.electronService.fs.lstatSync(childPath).birthtime,
                directoryTree: await this.directoryTreeService.buildTree(childPath),
                files: this.directoryTreeService.getFiles().map(file => {
                  return {...file, sync: null};
                }),
                sync: null
              };

              projects.push(project);
            }
          }

          this.localProjects = projects;
        }
      })
      .catch(error => console.log((error)));
  }

  synchronizeProjects(): void {
    this.remoteProjects.forEach((remoteProject) => {
      const localProjectIndex = this.localProjects.findIndex(localProject => localProject.name == remoteProject.name);

      if (localProjectIndex == -1) {
        remoteProject.sync = 'unsynchronized';
        remoteProject.files.forEach(remoteFile => remoteFile.sync = 'unsynchronized');
      } else {
        remoteProject.files.forEach((remoteFile) => {
          const localFileIndex = this.localProjects[localProjectIndex].files.findIndex(localFile => {
            const pathSegments = localFile.path.split(this.electronService.path.sep);
            const relativePathSegments = pathSegments.slice(pathSegments.indexOf(this.localProjects[localProjectIndex].name));
            const localRelativePath = this.electronService.path.join(...relativePathSegments);
            return localFile.name == remoteFile.name && localRelativePath == remoteFile.path;
          });

          if (localFileIndex == -1) {
            remoteFile.sync = 'unsynchronized';
          } else {
            if (remoteFile.sha256 == this.localProjects[localProjectIndex].files[localFileIndex].sha256) {
              remoteFile.sync = 'synchronized';
              this.localProjects[localProjectIndex].files[localFileIndex].sync = 'synchronized';
            } else {
              remoteFile.sync = 'unsynchronized';
              this.localProjects[localProjectIndex].files[localFileIndex].sync = 'unsynchronized';
            }
          }
        });

        if (remoteProject.files.every(file => file.sync == 'synchronized')) {
          remoteProject.sync = 'synchronized';
        } else {
          remoteProject.sync = 'unsynchronized';
        }

        if (this.localProjects[localProjectIndex].files.every(file => file.sync == 'synchronized')) {
          this.localProjects[localProjectIndex].sync = 'synchronized';
        } else {
          this.localProjects[localProjectIndex].sync = 'unsynchronized';
        }
      }
    });

    this.localProjects.forEach((localProject) => {
      if (localProject.sync == null) {
        localProject.sync = 'unsynchronized';
        localProject.files.forEach(localFile => localFile.sync = 'unsynchronized');
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
