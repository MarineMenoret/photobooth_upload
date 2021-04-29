import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  auth: any;

  constructor(
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.auth = this.authService.getAuth();
  }

  logout() {
    this.authService.logout();
  }

}
