
import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from "@angular/material/dialog";
import { CreatePhotoboothProject } from "./createPhotoboothProject/createPhotoboothProject.component"
import { PhotoboothOperationsService } from "../../../services/photobooth-operations/photobooth-operations.service";

@Component({
  selector: "photoboothProjectsList",
  templateUrl: "./photoboothProjectsList.component.html",
  styleUrls: ["./photoboothProjectsList.component.scss"]
})
export class PhotoboothProjectsListComponent {
  photoboothProjectsData: Array<object>;
  photoboothProjectsNames: Array<string>;
  displayedColumns = ["Projects", "actions-col"];
  projectsDirLocalPath: string; //local path of directory containing all projects folder
  selectedProjectLocalPath: string; //local path of selected project to import into photobooth

  constructor(
    public dialogRef: MatDialogRef<PhotoboothProjectsListComponent>,
    @Inject(MAT_DIALOG_DATA) public data,
    public matDialog: MatDialog,
    private photoboothOperationsService: PhotoboothOperationsService,
  ) { 
    this.photoboothProjectsData = this.data.photoboothProjects;
    this.projectsDirLocalPath = this.data.projectsDirLocalPath;
    this.selectedProjectLocalPath = this.data.selectedProjectLocalPath;
    this.photoboothProjectsNames = [];
    this.photoboothProjectsData.forEach(project => {
      this.photoboothProjectsNames.push(project['name']);
    });

  }

  onCreateNewProject() {
    this.matDialog.open(CreatePhotoboothProject, {
      data: {
        selectedProjectLocalPath: this.selectedProjectLocalPath
      },
      minWidth: '80%',
      height: '80%'
    });
  }
 
  async onSelect(projectName, photoboothProjectId) {
    let equipment_file_description_id = await this.photoboothOperationsService.callApi('Projects', 'getDataAcquisitions', { projectId: photoboothProjectId });

    this.photoboothOperationsService.importData(photoboothProjectId, true, equipment_file_description_id, this.projectsDirLocalPath, 10000, projectName, 5);
   
    this.dialogRef.close();
  }
}