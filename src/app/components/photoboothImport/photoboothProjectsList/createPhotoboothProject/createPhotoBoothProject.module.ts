import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../material-module';
import { SharedModule } from '../../../../shared/shared.module';
import { HotTableModule } from '@handsontable/angular';

import { CreatePhotoboothProject } from './createPhotoboothProject.component';

@NgModule({
  declarations: [CreatePhotoboothProject],
  imports: [
    CommonModule, 
    MaterialModule,
    SharedModule, 
    HotTableModule
  ],
  exports: [
    CreatePhotoboothProject
  ]
})
export class CreatePhotoboothProjectModule {}
