import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../../components/input';
import { ButtonComponent } from '../../components/button';
import { LogoComponent } from '../../components/logo';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, InputComponent, ButtonComponent, LogoComponent],
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.css',
})
export class ForgotPasswordPage {
  auth = inject(AuthService);
  
  email = '';
  submitted = signal(false);

  onSubmit() {
    if (!this.email) return;
    
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.submitted.set(true);
      }
    });
  }
}
