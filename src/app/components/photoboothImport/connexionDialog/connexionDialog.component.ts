
import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from "@angular/material/dialog";
import { PhotoboothOperationsService } from "../../../services/photobooth-operations/photobooth-operations.service";
import { PhotoboothProjectsListComponent } from "../photoboothProjectsList/photoboothProjectsList.component";
import { MatSnackBar } from "@angular/material/snack-bar";


@Component({
  selector: "connexionDialog",
  templateUrl: "./connexionDialog.component.html",
  styleUrls: ["./connexionDialog.component.scss"]
})
export class ConnexionDialogComponent {
  hostname: string;
  email: string;
  password: string;
  photoboothProjects: Object;
  projectsDirLocalPath: string;
  selectedProjectLocalPath: string;

  constructor(
    public dialogRef: MatDialogRef<ConnexionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data,
    private photoboothOperationsService: PhotoboothOperationsService,
    public matDialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.projectsDirLocalPath = this.data.projectsDirLocalPath;
    this.selectedProjectLocalPath = this.data.selectedProjectLocalPath;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onConnexion() {
    const connected = await this.photoboothOperationsService.connect(this.hostname, this.email, this.password);

    if (connected) {
      this.showSnackbar("Successfully connected.", "grey");
      this.photoboothProjects = await this.photoboothOperationsService.callApi('Projects', 'listProjects', { $limit: 100 });
      this.dialogRef.close();

      this.matDialog.open(PhotoboothProjectsListComponent, {
        data: {
          photoboothProjects: this.photoboothProjects['data'],
          projectsDirLocalPath: this.projectsDirLocalPath,
          selectedProjectLocalPath: this.selectedProjectLocalPath
        },
        minWidth: '50%',
      });
    } else {
      this.showSnackbar("Invalid login information.", "mat-warn");
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