import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { ProductFeedCardComponent } from '../../components/product-feed-card/product-feed-card';
import { LogoComponent } from '../../components/logo';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductFeedCardComponent, LogoComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private http = inject(HttpClient);
  authService = inject(AuthService);

  products = signal<any[]>([]);
  trendingProducts = signal<any[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.fetchFeed();
    this.fetchTrending();
  }

  fetchFeed() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/products`).subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load feed. Check if backend is running.');
        this.loading.set(false);
      }
    });
  }

  fetchTrending() {
    this.http.get<any[]>(`${environment.apiUrl}/products/trending`).subscribe({
      next: (data) => {
        this.trendingProducts.set(data);
      }
    });
  }

  handleUpvote(productId: string) {
    this.http.put<any>(`${environment.apiUrl}/products/${productId}/upvote`, {}).subscribe({
      next: (result) => {
        this.products.update(currentProducts => 
          currentProducts.map(p => p.id === productId ? { ...p, upvotes: result.upvotes } : p)
        );
        this.trendingProducts.update(currentTrending => 
          currentTrending.map(p => p.id === productId ? { ...p, upvotes: result.upvotes } : p)
        );
        // Re-fetch trending to ensure order is correct
        this.fetchTrending();
      }
    });
  }
}
