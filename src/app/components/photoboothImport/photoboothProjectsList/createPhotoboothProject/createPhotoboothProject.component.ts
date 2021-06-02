import { Component, Inject, Input, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PhotoboothOperationsService } from "../../../../services/photobooth-operations/photobooth-operations.service";

@Component({
  selector: "createPhotoboothProject",
  templateUrl: "./createPhotoboothProject.component.html",
  styleUrls: ["./createPhotoboothProject.component.scss"],
})

export class CreatePhotoboothProject implements OnInit {

  selectedProjectLocalPath;
  dataset: any[] = [
    { name: null, start_marker: null, end_marker: null, equipment_software_id: null, equipment_software_version_id: null, equipment_file_description_id: null },
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data,
    private photoboothOperationsService: PhotoboothOperationsService,
  ) {
    this.selectedProjectLocalPath = this.data.selectedProjectLocalPath;
  }

  ngOnInit(): void { }

  onGetData() {
    console.log("dataset : ", this.dataset);
  }

  onCreateProject() {
    this.photoboothOperationsService.createProject(this.selectedProjectLocalPath);
  }
}