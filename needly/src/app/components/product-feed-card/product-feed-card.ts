import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-feed-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-feed-card.html'
})
export class ProductFeedCardComponent {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private productService = inject(ProductService);

  @Input() product: any;
  @Output() upvote = new EventEmitter<string>();
  @Output() save = new EventEmitter<string>();

  isUpvoted(): boolean {
    const userId = this.authService.user()?.id;
    return this.product.upvotes?.includes(userId);
  }

  toggleUpvote(event: Event) {
    event.stopPropagation();
    this.upvote.emit(this.product.id);
  }

  isSaved(): boolean {
    const userId = this.authService.user()?.id;
    return this.product.savedBy?.includes(userId);
  }

  toggleSave(event: Event) {
    event.stopPropagation();
    this.save.emit(this.product.id);
    this.productService.saveProduct(this.product.id).subscribe({
      next: (res: any) => {
        this.product.savedBy = res.savedBy;
      }
    });
  }
}
