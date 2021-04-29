import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DirectoryTreeService } from '../../services/directory-tree/directory-tree.service';
import { ElectronService } from '../../core/services/electron/electron.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
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

  constructor(
    private router: Router,
    private authService: AuthService,
    private electronService: ElectronService,
    private directoryTreeService: DirectoryTreeService
  ) {
    this.auth = this.authService.getAuth();
    this.auth.authState.subscribe(authState => {
      if (!authState) this.initialize();
    })
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
    this.uploadStatusMsg = '';
    this.directoryTreeService.initialize();
  }

  onFolderSelect() {
    this.initialize();

    this.dialog.showOpenDialog({
      title: 'Select folder to upload',
      buttonLabel: 'Select',
      properties: ['openDirectory']
    }).then(directory => {
      if (!directory.canceled) {
        let directoryPath = directory.filePaths[0];
        this.directoryTree = this.directoryTreeService.setDirectoryPath(directoryPath);
        this.fileNames = this.directoryTreeService.getFileNames();
        console.log("directoryTree :", this.directoryTree);
      }
    })
  }

  onUploadBtnClick() {
    this.directoryTreeService.uploadDirectoryContent(this.directoryTree);

    this.uploadPercentage = this.directoryTreeService.getUploadPercentage();

    let uploadStatus = this.directoryTreeService.getUploadStatus();

    let uploadFinalized$ = uploadStatus.uploadFinalized;
    this.getFinalizedStatusSub = uploadFinalized$.subscribe(uploadFinalized => {
      this.uploadFinalized = uploadFinalized
    });

    let uploadStatusMsg$ = uploadStatus.uploadStatusMsg;
    this.getUploadMsgSub = uploadStatusMsg$.subscribe(uploadStatusMsg => {
      this.uploadStatusMsg = uploadStatusMsg
    });
  }

  onCancelBtnClick() {
    this.uploadCanceled = this.directoryTreeService.cancelUpload();
  }

  ngOnDestroy() {
    this.initialize();
    if (this.getFinalizedStatusSub) {
      this.getFinalizedStatusSub.unsubscribe();
    }
    if (this.getUploadMsgSub) {
      this.getUploadMsgSub.unsubscribe();
    }
  }
}
