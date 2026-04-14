import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CreateProductComponent } from '../../components/create-product/create-product';

@Component({
  selector: 'app-submit-page',
  standalone: true,
  imports: [CommonModule, CreateProductComponent],
  template: `
    <div class="max-w-2xl mx-auto flex flex-col font-body bg-white px-0 md:px-4">
      <!-- Sticky Page Heading -->
      <div class="sticky top-0 bg-white z-50 pt-6 md:pt-10 px-6 pb-6 flex-shrink-0 border-b-2 border-dashed border-black/10">
        <h1 class="text-3xl font-black text-black uppercase tracking-tighter" style="font-family: 'Manrope', sans-serif;">Post Product</h1>
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Share your creation with the community</p>
      </div>

      <!-- Form Content -->
      <div class="flex-1 px-0 pb-10 mt-6 md:mt-10">
        <div class="bg-white overflow-hidden mb-10">
          <app-create-product 
            (productCreated)="handleCreated($event)">
          </app-create-product>
        </div>
      </div>
    </div>
  `
})
export class SubmitPage {
  private router = inject(Router);


  handleCreated(product: any) {
    this.router.navigate(['/product', product.id]);
  }
}
