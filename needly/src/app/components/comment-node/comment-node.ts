import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-comment-node',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comment-node.html'
})
export class CommentNodeComponent {
  private authService = inject(AuthService);

  @Input() comment: any;
  @Input() depth: number = 0;
  @Output() reply = new EventEmitter<{ text: string, parentId: string }>();

  showReplyForm = signal<boolean>(false);
  isTextExpanded = signal<boolean>(false);
  replyText = '';
  user = this.authService.user;

  readonly TRUNCATE_LIMIT = 280; // Character limit for "Show more"

  shouldShowMore = computed(() => {
    return (this.comment?.content?.length || 0) > this.TRUNCATE_LIMIT;
  });

  displayText = computed(() => {
    const text = this.comment?.content || '';
    if (this.isTextExpanded() || !this.shouldShowMore()) {
      return text;
    }
    return text.substring(0, this.TRUNCATE_LIMIT) + '...';
  });

  getStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  submitReply() {
    if (!this.replyText.trim()) return;
    this.reply.emit({ text: this.replyText, parentId: this.comment.id });
    this.replyText = '';
    this.showReplyForm.set(false);
  }

  // Pass-through event from children
  onChildReply(event: any) {
    this.reply.emit(event);
  }
}
