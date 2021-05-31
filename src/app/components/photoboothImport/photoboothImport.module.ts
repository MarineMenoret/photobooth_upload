import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {MaterialModule} from '../../material-module';

import {PhotoboothImportComponent} from './photoboothImport.component';
import {SharedModule} from '../../shared/shared.module';

import {BrowserAnimationsModule} from "@angular/platform-browser/animations";

@NgModule({
  declarations: [PhotoboothImportComponent],
  imports: [
    MaterialModule,
    CommonModule,
    SharedModule,
    BrowserAnimationsModule,
  ],
  exports: [
    PhotoboothImportComponent
  ]
})
export class PhotoboothImportModule {
}
