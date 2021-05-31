import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {DialogData} from "../../shared/interfaces/dialog-data";

@Component({
  selector: 'app-sync-dialog',
  templateUrl: './sync-dialog.component.html',
  styleUrls: ['./sync-dialog.component.scss']
})
export class SyncDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
  }
}
