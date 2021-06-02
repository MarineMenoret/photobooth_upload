import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../material-module';
import { SharedModule } from '../../../../shared/shared.module';
import { SetProjectEventsModule } from './setProjectEvents/setProjectEvents.module';


import { CreatePhotoboothProject } from './createPhotoboothProject.component';

@NgModule({
  declarations: [CreatePhotoboothProject],
  imports: [
    CommonModule, 
    MaterialModule,
    SharedModule, 
    SetProjectEventsModule
  ],
  exports: [
    CreatePhotoboothProject
  ]
})
export class CreatePhotoboothProjectModule {}
