import { Component, OnInit, signal, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-create-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-product.html'
})
export class CreateProductComponent {
  private productService = inject(ProductService);
  @Output() productCreated = new EventEmitter<any>();

  newProduct = {
    name: '',
    tagline: '',
    description: '',
    websiteUrl: '',
    logo: '',
    category: 'AI'
  };

  categories = ['AI', 'Productivity', 'Marketing', 'Developer Tools', 'Design', 'Finance', 'Other'];
  loading = signal<boolean>(false);
  uploadingLogo = signal<boolean>(false);
  error = signal<string | null>(null);

  onLogoSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.uploadingLogo.set(true);
      this.productService.uploadLogo(file).subscribe({
        next: (response) => {
          this.newProduct.logo = response.logo;
          this.uploadingLogo.set(false);
        },
        error: (err) => {
          console.error('Logo upload failed', err);
          this.error.set("Logo upload failed. Please try again.");
          this.uploadingLogo.set(false);
        }
      });
    }
  }

  submitProduct() {
    if (!this.newProduct.name || !this.newProduct.tagline || !this.newProduct.description || !this.newProduct.websiteUrl) {
      this.error.set("Please fill in all required fields.");
      return;
    }

    this.loading.set(true);
    this.productService.createProduct(this.newProduct).subscribe({
      next: (createdProduct) => {
        this.productCreated.emit(createdProduct);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || "Failed to register product.");
        this.loading.set(false);
      }
    });
  }
}
