import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../components/card';
import { InputComponent } from '../../components/input';
import { ButtonComponent } from '../../components/button';
import { LogoComponent } from '../../components/logo';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CardComponent, InputComponent, ButtonComponent, LogoComponent],
  templateUrl: './signup-page.html',
  styleUrl: './signup-page.css',
})
export class SignupPage {
  auth = inject(AuthService);
  
  userData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  onSubmit() {
    this.auth.register(this.userData).subscribe();
  }

  onGoogleLogin() {
    this.auth.googleLogin();
  }
}
