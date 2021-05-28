import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {MaterialModule} from '../../material-module';
import {MatTableModule} from '@angular/material/table';

import {PhotoboothImportComponent} from './photoboothImport.component';
import {SharedModule} from '../../shared/shared.module';

import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatSnackBarModule} from "@angular/material/snack-bar";

@NgModule({
  declarations: [PhotoboothImportComponent],
  imports: [
    MaterialModule,
    MatTableModule,
    CommonModule,
    SharedModule,
    BrowserAnimationsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  exports: [
    PhotoboothImportComponent
  ]
})
export class PhotoboothImportModule {
}
