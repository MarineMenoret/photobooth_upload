import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material-module';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from '../../shared/shared.module';
import { ConnexionDialogModule } from './connexionDialog/connexionDialog.module'
import { LocalProjectsListModule } from './localProjectsList/localProjectsList.module'
import { PhotoboothProjectsListModule } from './photoboothProjectsList/photoboothProjectsList.module'
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { PhotoboothImportComponent } from './photoboothImport.component';
@NgModule({
  declarations: [PhotoboothImportComponent],
  imports: [
    MaterialModule,
    MatTableModule,
    BrowserAnimationsModule,
    ConnexionDialogModule,
    LocalProjectsListModule,
    PhotoboothProjectsListModule,
    CommonModule, 
    SharedModule, 
  ],
  exports: [
    PhotoboothImportComponent
  ]
})
export class PhotoboothImportModule {
}
