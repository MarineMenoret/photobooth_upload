import {Component, OnDestroy, OnInit} from "@angular/core";
import {IProject} from "../../shared/interfaces/project";
import {SyncService} from "../../services/sync/sync.service";
import {Subscription} from "rxjs";
import {ElectronService} from "../../core/services";
import {IDirectoryTree} from "../../shared/interfaces/directory-tree";
import {animate, state, style, transition, trigger} from "@angular/animations";

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
  remoteProjects: Array<IProject>;
  localProjects: Array<IProject>;
  expandedRemoteProject: IProject | null;
  expandedLocalProject: IProject | null;

  constructor(private syncService: SyncService, private electronService: ElectronService) {
  }

  ngOnInit(): void {
    this.initialize();
  }

  initialize(): void {
    this.subscriptions = new Array<Subscription>();
    this.displayedColumns = ['project', 'creation date', 'state'];
    this.remoteProjects = new Array<IProject>();
    this.localProjects = new Array<IProject>();

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
    const projects = new Array<IProject>();

    this.electronService.remote.dialog.showOpenDialog({
      title: "Select a folder to import projects into photobooth",
      buttonLabel: "Select",
      properties: ["openDirectory"],
    })
      .then((directory) => {
        if (!directory.canceled) {
          const directoryPath = directory.filePaths[0];
          const directoryChild = this.electronService.fs.readdirSync(directoryPath);

          directoryChild.forEach(child => {
            const childPath = this.electronService.path.join(directoryPath, child);
            if (this.electronService.fs.lstatSync(childPath).isDirectory()) {
              const project: IProject = {
                name: child,
                creationDate: this.electronService.fs.lstatSync(childPath).birthtime,
                directoryTree: {} as IDirectoryTree,
                files: []
              };
              projects.push(project);
            }
          });
          this.localProjects = projects;
        }
      })
      .catch(error => console.log((error)));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
