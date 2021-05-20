import {Component, OnDestroy, OnInit} from "@angular/core";
import {IProject} from "../../shared/interfaces/project";
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
  remoteProjects: Array<IProject>;
  localProjects: Array<IProject>;
  expandedRemoteProject: IProject | null;
  expandedLocalProject: IProject | null;

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
      .then(async (directory) => {
        if (!directory.canceled) {
          const directoryPath = directory.filePaths[0];
          const directoryChild = this.electronService.fs.readdirSync(directoryPath);

          for (const child of directoryChild) {
            const childPath = this.electronService.path.join(directoryPath, child);

            if (this.electronService.fs.lstatSync(childPath).isDirectory()) {
              this.directoryTreeService.initialize();

              const project: IProject = {
                name: child,
                creationDate: this.electronService.fs.lstatSync(childPath).birthtime,
                directoryTree: await this.directoryTreeService.buildTree(childPath),
                files: this.directoryTreeService.getFiles()
              };

              projects.push(project);
            }
          }

          this.localProjects = projects;
        }
      })
      .catch(error => console.log((error)));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
