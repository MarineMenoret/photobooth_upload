import { Component, Inject, OnInit } from "@angular/core";
import { PhotoboothOperationsService } from "../../../services/photobooth-operations/photobooth-operations.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from "@angular/router";
import { Globals } from "../../../shared/globals";
@Component({
  selector: "photoboothProjectsList",
  templateUrl: "./photoboothProjectsList.component.html",
  styleUrls: ["./photoboothProjectsList.component.scss"]
})
export class PhotoboothProjectsListComponent implements OnInit{
  photoboothProjects: Array<object>;
  displayedColumns = ["Projects", "actions-col"];
  projectsDirLocalPath: string; //local path of directory containing all projects folder
  isImporting: boolean;

  constructor(
    private photoboothOperationsService: PhotoboothOperationsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { 
    this.projectsDirLocalPath = Globals.projectsDirLocalPath;
    console.log("Globals.projectsDirLocalPath : ", Globals.projectsDirLocalPath);
  }

  async ngOnInit(){
    let photoboothProjectsData = await this.photoboothOperationsService.callApi('Projects', 'listProjects', { $limit: 100 });
    this.photoboothProjects = photoboothProjectsData['data'];
    this.isImporting = false;
  }

  onBackBtnClick(){
    //back to local/cloud projects list
  }

  onCreateNewProject() {
    this.router.navigate(['createPhotoboothProject']);
  }
 
  async onSelect(projectName, photoboothProjectId) {
    this.isImporting = true;
    let equipment_file_description_id = await this.photoboothOperationsService.callApi('Projects', 'getDataAcquisitions', { projectId: photoboothProjectId });

    let result = await this.photoboothOperationsService.importData(photoboothProjectId, true, equipment_file_description_id, this.projectsDirLocalPath, 10000, projectName, 5);

    if(result) {
      this.showSnackbar("Project successfully imported", "grey");
      this.isImporting = false;
    } else {
      this.showSnackbar("Error during project importation. Please retry", "mat-warn");
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