import { Component, Input, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ConnexionDialogComponent } from "../connexionDialog/connexionDialog.component"

@Component({
  selector: "localProjectsList",
  templateUrl: "./localProjectsList.component.html",
  styleUrls: ["./localProjectsList.component.scss"],
})
export class LocalProjectsList implements OnInit {
  @Input() projectsList: Array<object>;
  @Input() projectsDirLocalPath: Array<object>;
  displayedColumns: Array<string>;

  constructor(
    public matDialog: MatDialog
  ) {
    this.displayedColumns = ["Projects", "Local", "Distant", "actions-col"];
  }

  ngOnInit(): void {}

  onImportBtnClick(dirPath) {
    this.matDialog.open(ConnexionDialogComponent, {
      data: {
        projectsDirLocalPath: this.projectsDirLocalPath,
        selectedProjectLocalPath : dirPath
      },
    });
  }
}