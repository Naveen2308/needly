import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}`;
  private http = inject(HttpClient);

  products = signal<any[]>([]);
  currentProduct = signal<any>(null);
  comments = signal<any[]>([]);
  loading = signal<boolean>(false);

  getProducts(search?: string, category?: string): Observable<any[]> {
    let url = `${this.apiUrl}/products?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    return this.http.get<any[]>(url);
  }

  getProduct(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/products/${id}`).pipe(
      tap(product => this.currentProduct.set(product))
    );
  }

  createProduct(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/products`, data);
  }

  uploadLogo(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<any>(`${this.apiUrl}/products/upload-logo`, formData);
  }

  upvoteProduct(id: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/products/${id}/upvote`, {});
  }

  saveProduct(id: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/products/${id}/save`, {});
  }

  getComments(productId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/comments/${productId}`).pipe(
      tap(comments => this.comments.set(comments))
    );
  }

  submitComment(data: { product: string; rating?: number; text: string; parentId?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/comments`, data);
  }

  deleteComment(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/comments/${id}`);
  }

  globalSearch(q: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/products/search/global?q=${encodeURIComponent(q)}`);
  }
}
