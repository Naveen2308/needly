import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './explore.html'
})
export class ExploreComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);

  searchQuery = signal<string>('');
  activeCategory = signal<string | null>(null);
  
  categories = ['All', 'AI', 'Productivity', 'Marketing', 'Developer Tools', 'Design', 'Finance'];
  products = signal<any[]>([]);
  loading = signal<boolean>(false);

  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.fetchProducts();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe((query) => {
      this.fetchProducts(query, this.activeCategory() === 'All' ? null : this.activeCategory());
    });
  }

  onSearchChange(event: any) {
    const query = event.target.value;
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  setCategory(category: string) {
    this.activeCategory.set(category);
    this.fetchProducts(this.searchQuery(), category === 'All' ? null : category);
  }

  fetchProducts(search?: string, category?: string | null) {
    this.loading.set(true);
    let url = `${environment.apiUrl}/products?`;
    
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (category) url += `category=${encodeURIComponent(category)}&`;

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  goToProduct(id: string) {
    this.router.navigate(['/product', id]);
  }

  toggleUpvote(event: Event, product: any) {
    event.stopPropagation();
    this.http.put<any>(`${environment.apiUrl}/products/${product.id}/upvote`, {}).subscribe({
      next: (result) => {
        this.products.update(list => 
          list.map(p => p.id === product.id ? { ...p, upvotes: result.upvotes } : p)
        );
      }
    });
  }

  isUpvoted(product: any): boolean {
    const userId = this.authService.user()?.id;
    return product.upvotes?.includes(userId);
  }
}
