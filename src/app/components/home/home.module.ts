import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from '../../material-module';

import { HomeRoutingModule } from './home-routing.module';

import { HomeComponent } from './home.component';
import { SharedModule } from '../../shared/shared.module';

import { HeaderModule } from '../header/header.module'

import { AppConfig } from '../../../environments/environment';
import { NgxAuthFirebaseUIModule } from 'ngx-auth-firebaseui';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@NgModule({
  declarations: [HomeComponent],
  imports: [
    MaterialModule,
    HeaderModule,
    CommonModule, 
    SharedModule, 
    HomeRoutingModule,  
    NgxAuthFirebaseUIModule.forRoot(AppConfig.firebase),
    MatListModule,
    MatProgressBarModule
  ]
})
export class HomeModule {}
