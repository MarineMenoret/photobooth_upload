import { Component, Inject, Input, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PhotoboothOperationsService } from "../../../../services/photobooth-operations/photobooth-operations.service";
import { MatSnackBar } from "@angular/material/snack-bar";

@Component({
  selector: "createPhotoboothProject",
  templateUrl: "./createPhotoboothProject.component.html",
  styleUrls: ["./createPhotoboothProject.component.scss"],
})

export class CreatePhotoboothProject implements OnInit {

  selectedProjectLocalPath;
  events: any[] = [{}];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data,
    private photoboothOperationsService: PhotoboothOperationsService,
    private snackBar: MatSnackBar
  ) {
    this.selectedProjectLocalPath = this.data.selectedProjectLocalPath;
  }

  ngOnInit(): void { }

  async onCreateProject() {
    let result = await this.photoboothOperationsService.createProject(this.selectedProjectLocalPath, this.events);

    if(result) {
      this.showSnackbar("Project successfully created", "grey");
    } else {
      this.showSnackbar("Error during project creation. Please retry", "mat-warn");
    }
  }

  showSnackbar(msg, color) {
    this.snackBar.open(msg, null,
      {
        duration: 2000,
        panelClass: ['mat-toolbar', color]
      }
    );
  }
}