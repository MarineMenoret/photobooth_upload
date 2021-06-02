import { Component, OnInit } from "@angular/core";
// import * as Handsontable from 'handsontable';

@Component({
  selector: "setProjectEvents",
  templateUrl: "./setProjectEvents.component.html",
  styleUrls: ["./setProjectEvents.component.scss"],
})

export class SetProjectEvents implements OnInit {
  dataset: any[] = [
    { name: '', start_marker: '', end_marker: '', equipment_software_id: '', equipment_software_version_id: '', equipment_file_description_id: ''},
  ];

  ngOnInit() {}

  onGetData() {
    console.log("dataset : ", this.dataset);
  }
}