import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;
  private http = inject(HttpClient);

  profileUser = signal<any>(null);
  loading = signal<boolean>(false);

  getProfile(id: string): Observable<any> {
    this.loading.set(true);
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: (user) => {
          this.profileUser.set(user);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      })
    );
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/profile`, data);
  }

  uploadAvatar(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<any>(`${this.apiUrl}/upload-avatar`, formData);
  }

  followUser(id: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/follow`, {});
  }

  getUserProducts(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/products`);
  }

  getSavedProducts(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/saved-products`);
  }

  getUserPosts(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/posts`);
  }

  getSavedPosts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/me/saved`);
  }
}
