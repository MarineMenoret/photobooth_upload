
import { Component, Inject } from "@angular/core";
import { Router } from '@angular/router';
import { PhotoboothOperationsService } from "../../../services/photobooth-operations/photobooth-operations.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Globals } from "../../../shared/globals";

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
    private router: Router,
    private photoboothOperationsService: PhotoboothOperationsService,
    private snackBar: MatSnackBar
  ) {
    this.projectsDirLocalPath = Globals.projectsDirLocalPath;
    this.selectedProjectLocalPath = Globals.selectedProjectLocalPath;
  }

  onCancel(){
    //back to local/cloud projects list
  }

  async onConnexion() {
    const connected = await this.photoboothOperationsService.connect(this.hostname, this.email, this.password);

    if (connected) {
      this.showSnackbar("Successfully connected.", "grey");
      this.router.navigate(['/photoboothProjectsList']);
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