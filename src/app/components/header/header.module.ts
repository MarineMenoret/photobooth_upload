import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from '../../material-module';

// import { HomeRoutingModule } from './home-routing.module';

import { HeaderComponent } from './header.component';
import { SharedModule } from '../../shared/shared.module';

import { AppConfig } from '../../../environments/environment';
import { NgxAuthFirebaseUIModule } from 'ngx-auth-firebaseui';

@NgModule({
  declarations: [HeaderComponent],
  imports: [
    MaterialModule,
    CommonModule, 
    SharedModule, 
    // HomeRoutingModule,  
    NgxAuthFirebaseUIModule.forRoot(AppConfig.firebase),
  ],
  exports: [
    HeaderComponent
  ]
})
export class HeaderModule {}
