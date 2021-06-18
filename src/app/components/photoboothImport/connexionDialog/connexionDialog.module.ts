import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../material-module';
import { SharedModule } from '../../../shared/shared.module';

import { ConnexionDialogComponent } from './connexionDialog.component';
@NgModule({
  declarations: [ConnexionDialogComponent],
  imports: [
    CommonModule, 
    MaterialModule,
    SharedModule, 
  ],
  exports: [
    ConnexionDialogComponent
  ]
})
export class ConnexionDialogModule {}
