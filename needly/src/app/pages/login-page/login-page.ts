import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../../components/input';
import { ButtonComponent } from '../../components/button';
import { LogoComponent } from '../../components/logo';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, InputComponent, ButtonComponent, LogoComponent],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage implements OnInit {
  auth = inject(AuthService);
  private router = inject(Router);
  
  credentials = {
    email: '',
    password: ''
  };

  async ngOnInit() {
    await this.auth.forceAuthCheck();
    if (this.auth.user()) {
      this.router.navigate(['/home']);
    }
  }

  onSubmit() {
    this.auth.login(this.credentials).subscribe();
  }

  onGoogleLogin() {
    this.auth.googleLogin();
  }
}
