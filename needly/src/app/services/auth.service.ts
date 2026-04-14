import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { NotificationService } from './notification.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  
  user = signal<any>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  authReady = signal<boolean>(false);
  
  private authCheckPromise: Promise<boolean> | null = null;

  constructor(
    private http: HttpClient, 
    private router: Router,
    private notificationService: NotificationService
  ) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    // Only intercept token if NOT on the reset-password page
    // This prevents the app from misinterpreting a reset token as an access token
    if (token && !window.location.pathname.includes('/reset-password')) {
      console.log('Auth token found in URL, saving to localStorage');
      localStorage.setItem('accessToken', token);
      window.history.replaceState({}, '', '/home');
    }

    this.forceAuthCheck();
  }

  forceAuthCheck(): Promise<boolean> {
    if (this.authCheckPromise) {
      return this.authCheckPromise;
    }

    const token = localStorage.getItem('accessToken');

    this.authCheckPromise = new Promise((resolve) => {
      if (!token) {
        this.user.set(null);
        this.authReady.set(true);
        this.authCheckPromise = null;
        return resolve(false);
      }

      this.http.get(`${this.apiUrl}/profile`).subscribe({
        next: (user: any) => {
          this.user.set(user);
          this.notificationService.identify(user.id);
          this.authReady.set(true);
          this.authCheckPromise = null;
          resolve(true);
        },
        error: (err) => {
          this.user.set(null);
          this.authReady.set(true);
          this.authCheckPromise = null;
          resolve(false);
        }
      });
    });

    return this.authCheckPromise;
  }

  register(userData: any) {
    this.loading.set(true);
    this.authCheckPromise = null;
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap({
        next: (response) => {
          if (response.accessToken) {
            localStorage.setItem('accessToken', response.accessToken);
          }
          this.user.set(response);
          this.authReady.set(true);
          this.notificationService.identify(response.id);
          this.loading.set(false);
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Registration failed');
          this.loading.set(false);
          this.authCheckPromise = null;
        }
      })
    );
  }

  login(credentials: any) {
    this.loading.set(true);
    this.error.set(null);
    this.authCheckPromise = null;
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap({
        next: (response) => {
          if (response.accessToken) {
            localStorage.setItem('accessToken', response.accessToken);
          }
          this.user.set(response);
          this.authReady.set(true);
          this.notificationService.identify(response.id);
          this.loading.set(false);
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Login failed');
          this.loading.set(false);
          this.authCheckPromise = null;
        }
      })
    );
  }

  logout() {
    return this.http.get(`${this.apiUrl}/logout`).pipe(
      tap({
        next: () => this.finalizeLogout(),
        error: () => this.finalizeLogout()
      })
    );
  }

  public finalizeLogout() {
    this.user.set(null);
    localStorage.removeItem('accessToken');
    this.router.navigate(['/login']);
  }

  googleLogin() {
    window.location.href = `${this.apiUrl}/google`;
  }

  forgotPassword(email: string) {
    this.loading.set(true);
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email }).pipe(
      tap({
        next: () => this.loading.set(false),
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to send reset email');
          this.loading.set(false);
        }
      })
    );
  }

  resetPassword(data: any) {
    this.loading.set(true);
    return this.http.post<any>(`${this.apiUrl}/reset-password`, data).pipe(
      tap({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Password reset failed');
          this.loading.set(false);
        }
      })
    );
  }
}
