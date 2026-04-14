import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../../components/input';
import { ButtonComponent } from '../../components/button';
import { LogoComponent } from '../../components/logo';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, InputComponent, ButtonComponent, LogoComponent],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.css',
})
export class ResetPasswordPage implements OnInit {
  auth = inject(AuthService);
  route = inject(ActivatedRoute);
  
  token = '';
  password = '';
  confirmPassword = '';
  error = signal<string | null>(null);

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.error.set('Invalid or missing reset token.');
    }
  }

  onSubmit() {
    if (!this.token) return;
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }
    
    this.error.set(null);
    this.auth.resetPassword({ token: this.token, password: this.password }).subscribe();
  }
}
