import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-comment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comment-modal.html'
})
export class CommentModalComponent implements OnInit {
  private http = inject(HttpClient);
  authService = inject(AuthService);

  @Input() post: any;
  @Output() close = new EventEmitter<void>();
  @Output() postUpdated = new EventEmitter<any>();

  commentText = '';
  submitting = signal<boolean>(false);
  comments = signal<any[]>([]);
  expandedComments = signal<Set<string>>(new Set());

  ngOnInit() {
    this.comments.set(this.post?.comments || []);
  }

  toggleExpand(commentId: string) {
    this.expandedComments.update(set => {
      const newSet = new Set(set);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  }

  isExpanded(commentId: string): boolean {
    return this.expandedComments().has(commentId);
  }

  submitComment() {
    if (!this.commentText.trim()) return;

    this.submitting.set(true);
    this.http.post<any>(`${environment.apiUrl}/posts/${this.post.id}/comments`, {
      text: this.commentText
    }).subscribe({
      next: (updatedPost) => {
        this.comments.set(updatedPost.comments);
        this.postUpdated.emit(updatedPost);
        this.commentText = '';
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false)
    });
  }

  getTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d`;
  }
}
