import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { CommentNodeComponent } from '../../components/comment-node/comment-node';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CommentNodeComponent],
  templateUrl: './product-detail.html'
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private titleService = inject(Title);

  product = signal<any>(null);
  loading = signal<boolean>(true);
  isUpvoted = signal<boolean>(false);
  isSaved = signal<boolean>(false);
  upvoteCount = signal<number>(0);
  isDescExpanded = signal<boolean>(false);
  
  // Comment related
  commentText = '';
  commentRating = signal<number>(0);
  hoverRating = signal<number>(0);
  commentSubmitting = signal<boolean>(false);
  commentError = signal<string | null>(null);
  commentTree = signal<any[]>([]);
  userRating = signal<number>(0);
  showCommentForm = signal<boolean>(false);
  hasUserRated = signal<boolean>(false);
  isRatingSubmitting = signal<boolean>(false);
  ratingError = signal<string | null>(null);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadProduct(id);
      }
    });
  }

  loadProduct(id: string) {
    this.loading.set(true);
    forkJoin({
      product: this.productService.getProduct(id),
      comments: this.productService.getComments(id)
    }).subscribe({
      next: ({ product, comments }) => {
        const data = { ...product, comments };
        this.product.set(data);
        this.titleService.setTitle(`${data.name} | Needly`);
        this.upvoteCount.set(data.upvotes?.length || 0);
        this.checkIfUpvoted();
        this.checkIfSaved();
        this.buildCommentTree(data.comments || []);
        this.checkIfUserRated();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  checkIfUpvoted() {
    const user = this.authService.user();
    if (user && this.product()?.upvotes) {
      // Handle both array of IDs and array of objects
      this.isUpvoted.set(this.product().upvotes.some((u: any) => 
        (typeof u === 'string' ? u === user.id : u.userId === user.id)
      ));
    }
  }

  checkIfSaved() {
    const user = this.authService.user();
    if (user && this.product()?.savedBy) {
      this.isSaved.set(this.product().savedBy.some((s: any) => 
        (typeof s === 'string' ? s === user.id : s.userId === user.id)
      ));
    }
  }

  handleUpvote() {
    if (!this.authService.user()) {
      this.authService.finalizeLogout(); // Redirect to login
      return;
    }
    const id = this.product().id;
    this.productService.upvoteProduct(id).subscribe({
      next: (updatedProduct: any) => {
        this.product.set({ ...this.product(), upvotes: updatedProduct.upvotes });
        this.upvoteCount.set(updatedProduct.upvotes?.length || 0);
        this.checkIfUpvoted();
      }
    });
  }

  handleSave() {
    if (!this.authService.user()) {
      this.authService.finalizeLogout();
      return;
    }
    const id = this.product().id;
    this.productService.saveProduct(id).subscribe({
      next: (res: any) => {
        this.product.set({ ...this.product(), savedBy: res.savedBy });
        this.checkIfSaved();
      }
    });
  }
  
  checkIfUserRated() {
    const user = this.authService.user();
    if (!user || !this.product()?.comments) return;
    
    // Find a top-level comment (parentId is null) by this user that has a rating
    const ratedComment = this.product().comments.find((c: any) => 
      c.authorId === user.id && c.parentId === null && c.rating > 0
    );
    
    if (ratedComment) {
      this.hasUserRated.set(true);
      this.userRating.set(ratedComment.rating);
    } else {
      this.hasUserRated.set(false);
      this.userRating.set(0);
    }
  }

  buildCommentTree(comments: any[]) {
    if (!comments) return;
    const map = new Map();
    const roots: any[] = [];

    comments.forEach(c => {
      map.set(c.id, { ...c, replies: [] });
    });

    comments.forEach(c => {
      const hasContent = c.content && typeof c.content === 'string' && c.content.trim() !== '';
      if (!hasContent) return; // Skip rating-only database rows
      
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId).replies.push(map.get(c.id));
      } else {
        roots.push(map.get(c.id));
      }
    });

    this.commentTree.set(roots);
  }

  submitComment() {
    if (!this.commentText.trim()) return;
    
    this.commentSubmitting.set(true);
    this.productService.submitComment({
      product: this.product().id,
      text: this.commentText
    }).subscribe({
      next: () => {
        this.loadProduct(this.product().id);
        this.commentText = '';
        this.commentRating.set(0);
        this.showCommentForm.set(false);
        this.commentSubmitting.set(false);
      },
      error: (err: any) => {
        this.commentError.set(err.error?.message || 'Failed to post comment');
        this.commentSubmitting.set(false);
      }
    });
  }

  handleReply(event: { parentId: string, text: string }) {
    this.productService.submitComment({
      product: this.product().id,
      parentId: event.parentId,
      text: event.text
    }).subscribe({
      next: () => {
        this.loadProduct(this.product().id);
      }
    });
  }

  submitRating(rating: number) {
    if (rating === 0) return;
    
    this.isRatingSubmitting.set(true);
    this.ratingError.set(null);
    
    this.productService.submitComment({
      product: this.product().id,
      rating: rating,
      text: '' // Optional review text can be added later if desired
    }).subscribe({
      next: () => {
        this.loadProduct(this.product().id);
        this.isRatingSubmitting.set(false);
      },
      error: (err: any) => {
        this.ratingError.set(err.error?.message || 'Failed to submit rating');
        this.isRatingSubmitting.set(false);
      }
    });
  }

  quickRate(rating: number) {
    // Now just submits the rating directly or updates the state
    this.commentRating.set(rating);
    this.submitRating(rating);
  }

  getStars(rating: number) {
    return [1, 2, 3, 4, 5];
  }

  displayDescription() {
    const desc = this.product()?.description || '';
    if (this.isDescExpanded() || desc.length <= 300) return desc;
    return desc.substring(0, 300) + '...';
  }

  shouldShowMoreDesc() {
    return (this.product()?.description?.length || 0) > 300;
  }

  getTimeAgo(date: any) {
    if (!date) return '';
    const now = new Date();
    const past = new Date(date);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
}
