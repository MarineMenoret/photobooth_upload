import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PageNotFoundComponent } from './shared/components';
import { ConnexionDialogComponent } from './components/photoboothImport/connexionDialog/connexionDialog.component';
import { PhotoboothProjectsListComponent } from './components/photoboothImport/photoboothProjectsList/photoboothProjectsList.component';
import { CreatePhotoboothProject } from './components/photoboothImport/photoboothProjectsList/createPhotoboothProject/createPhotoboothProject.component';

import { HomeRoutingModule } from './components/home/home-routing.module';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: "photoboothConnexion",
    component: ConnexionDialogComponent
  },
  {
    path: "photoboothProjectsList",
    component: PhotoboothProjectsListComponent
  },
  {
    path: "createPhotoboothProject",
    component: CreatePhotoboothProject
  },
  {
    path: '**',
    component: PageNotFoundComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' }),
    HomeRoutingModule,
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
