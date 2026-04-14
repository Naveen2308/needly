import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;
  private http = inject(HttpClient);
  private socket: Socket | null = null;

  notifications = signal<any[]>([]);
  unreadCount = signal<number>(0);
  loading = signal<boolean>(false);

  constructor() {
    this.initSocket();
  }

  private initSocket() {
    const socketUrl = new URL(environment.apiUrl).origin;
    this.socket = io(socketUrl, {
      withCredentials: true,
      extraHeaders: {
        "ngrok-skip-browser-warning": "true"
      }
    });

    this.socket.on('new-notification', (notification) => {
      console.log('Real-time notification received:', notification);
      this.notifications.update(prev => [notification, ...prev]);
      this.unreadCount.update(count => count + 1);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('needly', {
          body: `Someone ${notification.message}!`,
          icon: '/favicon.ico'
        });
      }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });
  }

  identify(userId: string) {
    if (this.socket && userId) {
      this.socket.emit('identify', userId);
    }
  }

  fetchNotifications(): Observable<any> {
    this.loading.set(true);
    return this.http.get<any>(this.apiUrl).pipe(
      tap({
        next: (data) => {
          this.notifications.set(data || []);
          // Calculate unread count locally if not provided
          this.unreadCount.set(data?.filter((n: any) => !n.readStatus).length || 0);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      })
    );
  }

  markAsRead(id: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        this.notifications.update(list =>
          list.map(n => n.id === id ? { ...n, readStatus: true } : n)
        );
        this.unreadCount.update(c => Math.max(0, c - 1));
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.notifications.update(list =>
          list.map(n => ({ ...n, readStatus: true }))
        );
        this.unreadCount.set(0);
      })
    );
  }
}
