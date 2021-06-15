import { Component, OnDestroy, OnInit } from "@angular/core";
import { Router } from '@angular/router';
import { ISyncProject } from "../../shared/interfaces/project";
import { SyncService } from "../../services/sync/sync.service";
import { Subscription } from "rxjs";
import { ElectronService } from "../../core/services";
import { animate, state, style, transition, trigger } from "@angular/animations";
import { ISyncFile } from "../../shared/interfaces/file";
import { Globals } from "../../shared/globals";

@Component({
  selector: "photoboothImport",
  templateUrl: "./photoboothImport.component.html",
  styleUrls: ["./photoboothImport.component.scss"],
  animations: [trigger('detailExpand', [
    state('collapsed', style({ height: '0px', minHeight: '0' })),
    state('expanded', style({ height: '*' })),
    transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
  ]),
  ],
})

export class PhotoboothImportComponent implements OnInit, OnDestroy {
  subscriptions: Array<Subscription>;
  displayedProjectColumns: Array<string>;
  displayedFileColumns: Array<string>;
  syncProjects: Array<ISyncProject>;
  expandedSyncProject: ISyncProject | null;
  isLoading: boolean;
  projectsDirLocalPath: string;
  localProjectsDirPaths: object;

  constructor(
    private router: Router,
    private syncService: SyncService,
    private electronService: ElectronService,
    ) {}

  ngOnInit(): void {
    this.initialize();
  }

  initialize(): void {
    this.subscriptions = new Array<Subscription>();
    this.displayedProjectColumns = ['project', 'creation date', 'sync state'];
    this.displayedFileColumns = ['file', 'file creation date', 'file sync state', 'actions-col'];
    this.syncProjects = new Array<ISyncProject>();
    this.isLoading = false;

    this.subscriptions.push(
      this.syncService.notifySyncProjects().subscribe((projects) => {
        this.syncProjects = projects;
        this.isLoading = false;
      })
    );
  }

  getSyncProjects(): void {
    this.electronService.remote.dialog.showOpenDialog({
      title: "Select a folder to import projects into photobooth",
      buttonLabel: "Select",
      properties: ["openDirectory"],
    })
      .then(async directory => {
        if (!directory.canceled) {
          this.isLoading = true;
          this.projectsDirLocalPath = directory.filePaths[0];
          Globals.projectsDirLocalPath = directory.filePaths[0];
          try {
            await this.syncService.getSyncProjects(directory.filePaths[0]);
            this.localProjectsDirPaths = await this.syncService.getChildrenDirPath(directory.filePaths[0]);
          } catch (error) {
            console.log(error);
          }
        }
      })
      .catch(error => console.log((error)));
  }

  syncProject(project: ISyncProject, event: MouseEvent): void {
    this.syncService.syncProject(project, event);
  }

  downloadProject(project: ISyncProject, event: MouseEvent): void {
    this.syncService.downloadProject(project, event);
  }

  uploadProject(project: ISyncProject, event: MouseEvent): void {
    this.syncService.uploadProject(project, event);
  }

  syncFile(project: ISyncProject, file: ISyncFile): void {
    this.syncService.syncFile(project, file);
  }

  async downloadFiles(project: ISyncProject, files: Array<ISyncFile>, areConflictingFiles?: boolean): Promise<void> {
    return this.syncService.downloadFiles(project, files, areConflictingFiles);
  }

  async uploadFiles(project: ISyncProject, files: Array<ISyncFile>, areConflictingFiles?: boolean): Promise<void> {
    return this.syncService.uploadFiles(project, files, areConflictingFiles);
  }

  showSnackBar(message: string, event?: MouseEvent): void {
    this.syncService.showSnackBar(message, event);
  }

  onImportBtnClick(projectName) {
    Globals.selectedProjectLocalPath = this.localProjectsDirPaths[projectName];
    console.log("Globals.selectedProjectLocalPath : ", Globals.selectedProjectLocalPath);
    if (Globals.photoboothApi == undefined) {
      this.router.navigate(['/photoboothConnexion'])
    } else {
      this.router.navigate(['/photoboothProjectsList'])
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
