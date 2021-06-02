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

  constructor(
    @Inject(MAT_DIALOG_DATA) public data,
    private photoboothOperationsService: PhotoboothOperationsService,
  ) { 
    this.selectedProjectLocalPath = this.data.selectedProjectLocalPath;
  }

  ngOnInit(): void { }

  onCreateProject() {
    this.photoboothOperationsService.createProject(this.selectedProjectLocalPath);
  }
}