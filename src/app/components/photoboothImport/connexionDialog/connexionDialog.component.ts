
import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from "@angular/material/dialog";
import { PhotoboothOperationsService } from "../../../services/photobooth-operations/photobooth-operations.service";
import { PhotoboothProjectsListComponent } from "../photoboothProjectsList/photoboothProjectsList.component"

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
    public matDialog: MatDialog
  ) { 
    this.projectsDirLocalPath = this.data.projectsDirLocalPath;
    this.selectedProjectLocalPath = this.data.selectedProjectLocalPath;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onConnexion() {
    await this.photoboothOperationsService.connect(this.hostname, this.email, this.password);
    this.photoboothProjects = await this.photoboothOperationsService.callApi('Projects', 'listProjects', {$limit : 100});
    this.dialogRef.close();

    //TODO : afficher seulement si la connexion est établie. Sinon afficher erreur d'authentictaion
    this.matDialog.open(PhotoboothProjectsListComponent, {
      data: {
        photoboothProjects : this.photoboothProjects['data'],
        projectsDirLocalPath : this.projectsDirLocalPath,
        selectedProjectLocalPath : this.selectedProjectLocalPath
      },
    });
  }
}