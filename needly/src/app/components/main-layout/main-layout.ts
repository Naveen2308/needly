import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ProductService } from '../../services/product.service';
import { LogoComponent } from '../logo';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, LogoComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayout implements OnInit {
  authService = inject(AuthService);
  notifService = inject(NotificationService);
  productService = inject(ProductService);
  private router = inject(Router);

  user = this.authService.user;

  // Search
  searchQuery = signal<string>('');
  searchResults = signal<any>(null);
  showSearchResults = signal<boolean>(false);
  searchLoading = signal<boolean>(false);

  private searchTimeout: any = null;

  ngOnInit() {
    // Fetch unread notification count on load
    this.notifService.fetchNotifications().subscribe();
  }

  onSearchInput(event: any) {
    const query = event.target.value;
    this.searchQuery.set(query);

    if (this.searchTimeout) clearTimeout(this.searchTimeout);

    if (!query.trim()) {
      this.showSearchResults.set(false);
      this.searchResults.set(null);
      return;
    }

    this.searchLoading.set(true);
    this.searchTimeout = setTimeout(() => {
      this.productService.globalSearch(query).subscribe({
        next: (results) => {
          this.searchResults.set(results);
          this.showSearchResults.set(true);
          this.searchLoading.set(false);
        },
        error: () => this.searchLoading.set(false)
      });
    }, 400);
  }

  closeSearch() {
    setTimeout(() => {
      this.showSearchResults.set(false);
    }, 200);
  }

  navigateToProduct(id: string) {
    this.showSearchResults.set(false);
    this.searchQuery.set('');
    this.router.navigate(['/product', id]);
  }

  navigateToUser(id: string) {
    this.showSearchResults.set(false);
    this.searchQuery.set('');
    this.router.navigate(['/profile', id]);
  }
}
