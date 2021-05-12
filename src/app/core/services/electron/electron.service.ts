import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { IpcRenderer, Remote, WebFrame } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as request from 'request'
import { ChildProcess } from 'node:child_process';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  ipcRenderer: IpcRenderer;
  webFrame: WebFrame;
  remote: Remote;
  childProcess: ChildProcess;
  fs: typeof fs;
  path: typeof path;
  request: typeof request;

  get isElectron(): boolean {
    return !!(window && window.process && window.process.type);
  }

  constructor() {
    // Conditional imports
    if (this.isElectron) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.webFrame = window.require('electron').webFrame;

      // If you want to use remote object in renderer process, please set enableRemoteModule to true in main.ts
      this.remote = window.require('@electron/remote');
      // console.log('remote - globalShortcut', this.remote.globalShortcut);

      this.childProcess = window.require('child_process');
      this.fs = window.require('fs');
      this.path = window.require('path');
      this.request = window.require('request');
    }
  }
}
