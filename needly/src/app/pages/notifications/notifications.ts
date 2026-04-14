import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html'
})
export class NotificationsComponent implements OnInit {
  notifService = inject(NotificationService);
  private router = inject(Router);

  ngOnInit() {
    this.notifService.fetchNotifications().subscribe();
  }

  markAllRead() {
    this.notifService.markAllAsRead().subscribe();
  }

  markRead(id: string) {
    this.notifService.markAsRead(id).subscribe();
  }

  handleNotificationClick(notif: any) {
    // 1. Mark as read
    if (!notif.readStatus) {
      this.markRead(notif.id);
    }

    // 2. Navigate based on type and associated data
    if (notif.product) {
      this.router.navigate(['/product', notif.product.id || notif.product]);
    } else if (notif.post) {
      this.router.navigate(['/post', notif.post.id || notif.post]);
    } else if (notif.type === 'follow' && notif.sender) {
      this.router.navigate(['/profile', notif.sender.id || notif.sender]);
    }
  }

  getTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  }

  getIcon(type: string): string {
    switch (type) {
      case 'like': return 'favorite';
      case 'comment': return 'chat_bubble';
      case 'review': return 'star';
      case 'follow': return 'person_add';
      case 'upvote': return 'arrow_upward';
      default: return 'notifications';
    }
  }

  getIconColor(type: string): string {
    switch (type) {
      case 'like': return '#ef4444';
      case 'comment': return '#3b82f6';
      case 'review': return '#f59e0b';
      case 'follow': return '#8b5cf6';
      case 'upvote': return '#10b981';
      default: return '#64748b';
    }
  }
}
