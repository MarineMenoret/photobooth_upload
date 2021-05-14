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
    this.displayedColumns = ["Projects", "actions-col"];

    this.initialize();
  }

  initialize() {
    this.projectsList = ["projet1", "projet2", "projet3"];
  }

  ngOnInit(): void {
    //récupérer la liste de projet sur PB qui contiendra le nouveau projet crée manuellement directement sur PB
  }

  onSelectFolderBtnClick() {
    this.dialog
      .showOpenDialog({
        title: "Select folder to import into photobooth",
        buttonLabel: "Select",
        properties: ["openDirectory"],
      })
      .then((directory) => {
        if (!directory.canceled) {
          console.log("directory:", directory);
        }
      });
  }

  onImportBtnClick() {
    console.log("import button clicked");
    //appeler album
  }
}
