import { Injectable, inject, Injector } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  
  private injector = inject(Injector);

  private get authService() {
    return this.injector.get(AuthService);
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('accessToken');
    
    // Clone the request to add headers
    const headersConfig: any = {
      'ngrok-skip-browser-warning': 'true'
    };
    
    if (token) {
      headersConfig['Authorization'] = `Bearer ${token}`;
    }

    const authReq = request.clone({
      setHeaders: headersConfig
    });

    return next.handle(authReq).pipe(
      catchError(error => {
        // If we get a 401, it means the token might be expired
        if (error instanceof HttpErrorResponse && error.status === 401 && !request.url.includes('/login')) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      // In a separate-URL setup, we'd typically use the refreshToken here.
      // For now, if 401 occurs, we simplify by logging out.
      this.isRefreshing = false;
      this.authService.finalizeLogout(); // Use the logout cleanup logic
      return throwError(() => new Error('Session expired'));
    } else {
      return this.refreshTokenSubject.pipe(
        filter(result => result !== null),
        take(1),
        switchMap(() => next.handle(request))
      );
    }
  }
}
