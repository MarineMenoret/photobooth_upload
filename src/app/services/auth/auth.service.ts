import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Globals } from '../../shared/globals'
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    public auth: AngularFireAuth
  ) {}


  /**
   * @returns app authentication
   */
  getAuth(){
    return this.auth;
  }

  /**
   * photobooth_upload app loging out
   */
  logout(){
    this.auth.signOut();
    //remove access to photobooth :
    Globals.photoboothAuthToken = undefined; 
    Globals.photoboothApi = undefined;
    Globals.photoboothHostname = undefined;
  }
}
