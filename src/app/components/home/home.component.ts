import { Component, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { DirectoryTreeService } from "../../services/directory-tree/directory-tree.service";
import { ElectronService } from "../../core/services/electron/electron.service";
import { Subscription } from "rxjs";
import { AuthService } from "../../services/auth/auth.service";
import { StorageService } from "../../services/storage/storage.service";
import { MatSelectionListChange } from "@angular/material/list";
import { Reference } from "@angular/fire/storage/interfaces";
import { subscribeOn } from "rxjs/operators";

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements OnInit, OnDestroy {
  auth: any;
  fs: any;
  path: any;
  dialog: any;
  directoryTree: Object;
  fileNames: Array<any>;
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
  isDownloading: boolean;
  downloadSubscriptions: Array<Subscription>;

  constructor(
    private router: Router,
    private authService: AuthService,
    private electronService: ElectronService,
    private directoryTreeService: DirectoryTreeService,
    private storageService: StorageService
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
    this.uploadPercentage = {};
    this.uploadFinalized = false;
    this.uploadCanceled = false;
    this.uploadStatusMsg = "";
    this.directoryTreeService.initialize();
    this.projectsFolders = new Array<Reference>();
    this.selectedFolder = "";
    this.filesToDownload = Array<string>();
    this.downloadPercentage = Array<number>();
    this.storageService.downloadProgress.subscribe((file) => {
      const index = this.filesToDownload.findIndex(value => value == file.fileName);
      if (index == -1) {
        this.downloadPercentage.push(file.downloadPercentage);
        this.filesToDownload.push(file.fileName);
      } else {
        this.downloadPercentage[index] = file.downloadPercentage;
      }
    });
    this.isDownloading = false;
    this.downloadSubscriptions = new Array<Subscription>();
  }

  onFolderSelect() {
    this.initialize();

    this.dialog
      .showOpenDialog({
        title: "Select folder to upload",
        buttonLabel: "Select",
        properties: ["openDirectory"],
      })
      .then((directory) => {
        if (!directory.canceled) {
          let directoryPath = directory.filePaths[0];
          this.directoryTree = this.directoryTreeService.setDirectoryPath(
            directoryPath
          );
          this.fileNames = this.directoryTreeService.getFileNames();
          this.directoryTreeService.saveFilePaths(directoryPath);
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
    this.filesToDownload.length = 0;
    this.downloadPercentage.length = 0;
    this.isDownloading = true;
    const folderToDownload = this.projectsFolders.find(folder => folder.name == this.selectedFolder);
    this.storageService.getFiles(folderToDownload);
  }

  onPrevious(): void {
    this.isDownloading = false;
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
