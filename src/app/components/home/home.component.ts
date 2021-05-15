import { ChangeDetectorRef, Component, OnDestroy, OnInit } from "@angular/core";
import { DirectoryTreeService } from "../../services/directory-tree/directory-tree.service";
import { ElectronService } from "../../core/services/electron/electron.service";
import { Subscription } from "rxjs";
import { AuthService } from "../../services/auth/auth.service";
import { StorageService } from "../../services/storage/storage.service";
import { MatSelectionListChange } from "@angular/material/list";
import { Reference } from "@angular/fire/storage/interfaces";
import { Dialog } from "electron";
import { IDirectoryTree } from "../../shared/interfaces/directory-tree";
import * as request from 'request';

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements OnInit, OnDestroy {
  auth: any;
  fs: any;
  path: any;
  dialog: Dialog;
  directoryTree: IDirectoryTree;
  fileNames: Array<any>;
  fileExtensions: Array<any>;
  uploadPercentage: Object;
  uploadFinalized: boolean;
  uploadStatusMsg: string;
  uploadCanceled: boolean;
  getFinalizedStatusSub: Subscription;
  getUploadMsgSub: Subscription;
  projectsFolders: Array<Reference>;
  selectedFolder: string;
  filesToDownload: Array<string>;
  downloadPercentage: Array<number>;
  filesCorruption: Array<boolean>;
  isDownloading: boolean;
  downloadSubscriptions: Array<Subscription>;
  downloadRequests: Array<request.Request>;

  constructor(
    private authService: AuthService,
    private electronService: ElectronService,
    private directoryTreeService: DirectoryTreeService,
    private storageService: StorageService,
    private ref: ChangeDetectorRef
  ) {
    this.auth = this.authService.getAuth();
    this.auth.authState.subscribe((authState) => {
      if (authState) {
        this.getProjectFolders();
      } else {
        this.initialize();
      }
    });
    this.fs = this.electronService.fs;
    this.path = this.electronService.path;
    this.dialog = this.electronService.remote.dialog;
  }

  ngOnInit(): void {
    this.initialize();
  }

  initialize() {
    this.fileNames = [];
    this.fileExtensions = [];
    this.uploadPercentage = {};
    this.uploadFinalized = false;
    this.uploadCanceled = false;
    this.uploadStatusMsg = "";
    this.directoryTreeService.initialize();
    this.projectsFolders = new Array<Reference>();
    this.selectedFolder = "";
    this.filesToDownload = new Array<string>();
    this.downloadPercentage = new Array<number>();
    this.filesCorruption = new Array<boolean>();
    this.isDownloading = false;
    this.downloadSubscriptions = new Array<Subscription>();
    this.downloadRequests = new Array<request.Request>();

    const fileNamesSubscription = this.storageService.fileNamesNotification.subscribe((files) => {
      this.filesToDownload = files;
      this.filesCorruption = new Array<boolean>(files.length).fill(false);
      this.ref.detectChanges();
    });

    const downloadProgressSubscription = this.storageService.downloadProgressNotification.subscribe((downloadProgress) => {
      this.downloadPercentage = downloadProgress;
      this.ref.detectChanges();
    });

    const filesCorruptionSubscription = this.storageService.filesCorruptionNotification.subscribe((filesCorruption) => {
      this.filesCorruption = filesCorruption;
      this.ref.detectChanges();
    });

    const projectDownloadSubscription = this.storageService.projectDownloadIsSuccessful.subscribe((isCompleted) => {
      if (isCompleted) {
        this.dialog.showMessageBox({
          message: 'Project download successfully completed.',
          type: 'info'
        });
      }
    });

    const downloadRequestSubscription = this.storageService.filesDownloadRequestNotification.subscribe(requests => this.downloadRequests = requests);

    this.downloadSubscriptions.push(fileNamesSubscription);
    this.downloadSubscriptions.push(downloadProgressSubscription);
    this.downloadSubscriptions.push(projectDownloadSubscription);
    this.downloadSubscriptions.push(downloadRequestSubscription);
    this.downloadSubscriptions.push(filesCorruptionSubscription);
  }

  onFolderSelect() {
    this.initialize();

    this.dialog
      .showOpenDialog({
        title: "Select folder to upload",
        buttonLabel: "Select",
        properties: ["openDirectory"],
      })
      .then(async (directory) => {
        if (!directory.canceled) {
          let directoryPath = directory.filePaths[0];
          this.directoryTree = await this.directoryTreeService.setDirectoryPath(
            directoryPath
          );
          this.fileNames = this.directoryTreeService.getFileNames();
          this.fileExtensions = this.directoryTreeService.getFileExtensions();
          console.log("directoryTree :", this.directoryTree);
        }
      });
  }

  onUploadBtnClick() {
    this.directoryTreeService.uploadDirectoryContent(this.directoryTree);

    this.uploadPercentage = this.directoryTreeService.getUploadPercentage();

    let uploadStatus = this.directoryTreeService.getUploadStatus();

    let uploadFinalized$ = uploadStatus.uploadFinalized;
    this.getFinalizedStatusSub = uploadFinalized$.subscribe(
      (uploadFinalized) => {
        this.uploadFinalized = uploadFinalized;
      }
    );

    let uploadStatusMsg$ = uploadStatus.uploadStatusMsg;
    this.getUploadMsgSub = uploadStatusMsg$.subscribe((uploadStatusMsg) => {
      this.uploadStatusMsg = uploadStatusMsg;
    });
  }

  onCancelBtnClick() {
    this.uploadCanceled = this.directoryTreeService.cancelUpload();
  }

  getProjectFolders(): void {
    const getFoldersSubscription = this.storageService.getFolders().subscribe(
      (result) => {
        this.projectsFolders = result.prefixes;
      },
      (error) => {
        console.log(error);
      },
      () => {
        console.log("Download folders successfully completed!");
      }
    );
    this.downloadSubscriptions.push(getFoldersSubscription)
  }

  onSelectionChange(event: MatSelectionListChange): void {
    this.selectedFolder = event.options[0].value;
  }

  onDownload(): void {
    this.downloadRequests.length = 0;
    this.dialog.showOpenDialog({
      title: "Choose a folder to save your files",
      properties: ['openDirectory'],
    }).then((directory) => {
      if (!directory.canceled) {
        const projectFolder = this.projectsFolders.find(folder => folder.name == this.selectedFolder);
        this.storageService.downloadProject(projectFolder, directory.filePaths[0]);
        this.isDownloading = true;
      }
    });
  }

  onPrevious(): void {
    this.isDownloading = false;
  }

  onDownloadRestart(fileIndex: number): void {
    if (this.downloadRequests[fileIndex] != null) {
      // TODO: restart the download request.
    } else {
      // TODO: error.
    }
  }

  onDownloadCancel(fileIndex: number): void {
    if (this.downloadRequests[fileIndex] != null) {
      this.downloadRequests[fileIndex].abort();
    } else {
      console.log("The download of this file has not yet started!");
    }
  }

  ngOnDestroy() {
    this.initialize();
    if (this.getFinalizedStatusSub) {
      this.getFinalizedStatusSub.unsubscribe();
    }
    if (this.getUploadMsgSub) {
      this.getUploadMsgSub.unsubscribe();
    }

    this.downloadSubscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
