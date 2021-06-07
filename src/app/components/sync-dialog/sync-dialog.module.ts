import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncDialogComponent } from './sync-dialog.component';
import {MaterialModule} from "../../material-module";
import {SharedModule} from "../../shared/shared.module";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";



@NgModule({
  declarations: [
    SyncDialogComponent
  ],
  imports: [
    CommonModule,
    MaterialModule,
    SharedModule,
    BrowserAnimationsModule,
  ]
})
export class SyncDialogModule { }
