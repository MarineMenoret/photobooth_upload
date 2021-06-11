import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../material-module';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from '../../../shared/shared.module';
import { CreatePhotoboothProjectModule } from './createPhotoboothProject/createPhotoBoothProject.module'

import { PhotoboothProjectsListComponent } from './photoboothProjectsList.component';

@NgModule({
  declarations: [PhotoboothProjectsListComponent],
  imports: [
    CommonModule, 
    MaterialModule,
    MatTableModule,
    SharedModule, 
    CreatePhotoboothProjectModule
  ],
  exports: [
    PhotoboothProjectsListComponent
  ]
})
export class PhotoboothProjectsListModule {}
