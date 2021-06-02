import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../../material-module';
import { SharedModule } from '../../../../../shared/shared.module';
import { HotTableModule } from '@handsontable/angular';

import { SetProjectEvents } from './setProjectEvents.component';

@NgModule({
  declarations: [SetProjectEvents],
  imports: [
    CommonModule, 
    MaterialModule,
    SharedModule, 
    HotTableModule
  ],
  exports: [
    SetProjectEvents
  ]
})
export class SetProjectEventsModule {}
