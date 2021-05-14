import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from '../../material-module';
import { MatTableModule } from '@angular/material/table';

import { PhotoboothImportComponent } from './photoboothImport.component';
import { SharedModule } from '../../shared/shared.module';


import { AppConfig } from '../../../environments/environment';

@NgModule({
  declarations: [PhotoboothImportComponent],
  imports: [
    MaterialModule,
    MatTableModule,
    CommonModule, 
    SharedModule, 
  ],
  exports: [
    PhotoboothImportComponent
  ]
})
export class PhotoboothImportModule {}
