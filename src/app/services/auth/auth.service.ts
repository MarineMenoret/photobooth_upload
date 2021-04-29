import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    public auth: AngularFireAuth
  ) {
    // console.log("auth :", auth);
  }

  getAuth(){
    return this.auth;
  }

  logout(){
    this.auth.signOut();
  }
}
