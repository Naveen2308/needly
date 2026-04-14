import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private titleService = inject(Title);
  userService = inject(UserService);
  authService = inject(AuthService);

  activeTab = signal<'products' | 'saved'>('products');
  userProducts = signal<any[]>([]);
  savedProducts = signal<any[]>([]);
  isOwnProfile = signal<boolean>(false);
  isFollowing = signal<boolean>(false);
  profileId: string = '';

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.profileId = params['id'];
      this.loadProfile(this.profileId);
    });
  }

  loadProfile(id: string) {
    const currentUser = this.authService.user();
    this.isOwnProfile.set(currentUser?.id === id);

    this.userService.getProfile(id).subscribe(user => {
      this.titleService.setTitle(`${user.name} | Needly`);
      if (currentUser) {
        this.isFollowing.set(user.followers?.some((f: any) => f.id === currentUser.id || f === currentUser.id));
      }
    });

    this.userService.getUserProducts(id).subscribe(products => this.userProducts.set(products));

    this.userService.getSavedProducts(id).subscribe(products => this.savedProducts.set(products));
  }

  toggleFollow() {
    this.userService.followUser(this.profileId).subscribe(result => {
      this.isFollowing.update(v => !v);
      this.userService.getProfile(this.profileId).subscribe();
    });
  }

  setTab(tab: 'products' | 'saved') {
    this.activeTab.set(tab);
  }
}
