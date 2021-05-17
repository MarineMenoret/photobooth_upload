import { Component, OnInit } from "@angular/core";
import { ElectronService } from "../../core/services/electron/electron.service";

@Component({
  selector: "photoboothImport",
  templateUrl: "./photoboothImport.component.html",
  styleUrls: ["./photoboothImport.component.scss"],
})
export class PhotoboothImportComponent implements OnInit {
  fs: any;
  path: any;
  dialog: any;
  projectsList: Array<string>;
  displayedColumns: Array<string>;

  constructor(private electronService: ElectronService) {
    this.fs = this.electronService.fs;
    this.path = this.electronService.path;
    this.dialog = this.electronService.remote.dialog;
    this.displayedColumns = ["Projects", "Local", "Distant", "actions-col"];

    this.initialize();
  }

  initialize() {
    this.projectsList = [];
  }

  ngOnInit(): void {}

  onSelectFolderBtnClick() {
    this.initialize();
    this.dialog
      .showOpenDialog({
        title: "Select folder to import into photobooth",
        buttonLabel: "Select",
        properties: ["openDirectory"],
      })
      .then((directory) => {
        if (!directory.canceled) {
          const directoryPath = directory.filePaths[0];
          const directoryChild = this.fs.readdirSync(directoryPath);

          directoryChild.forEach(child => {
            const childPath = this.path.join(directoryPath, child);
            if (this.fs.lstatSync(childPath).isDirectory()) {
              this.projectsList.push(child);
            } 
          });

          
        }
      });
  }

  onImportBtnClick() {
    console.log("import button clicked");
    //appeler album
  }
}
