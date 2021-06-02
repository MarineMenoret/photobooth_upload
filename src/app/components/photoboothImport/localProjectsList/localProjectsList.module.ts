import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../material-module';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from '../../../shared/shared.module';

import { LocalProjectsList } from './localProjectsList.component';

@NgModule({
  declarations: [LocalProjectsList],
  imports: [
    CommonModule, 
    MaterialModule,
    MatTableModule,
    SharedModule, 
  ],
  exports: [
    LocalProjectsList
  ]
})
export class LocalProjectsListModule {}
