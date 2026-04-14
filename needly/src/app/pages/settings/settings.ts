import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html'
})
export class SettingsComponent implements OnInit {
  authService = inject(AuthService);
  userService = inject(UserService);
  private router = inject(Router);

  profileData = {
    name: '',
    bio: '',
    website: '',
    avatar: ''
  };

  saving = signal<boolean>(false);
  saved = signal<boolean>(false);
  uploading = signal<boolean>(false);
  activeSection = signal<string>('profile');

  ngOnInit() {
    const user = this.authService.user();
    if (user) {
      this.profileData.name = user.name || '';
      this.profileData.bio = user.bio || '';
      this.profileData.website = user.website || '';
      this.profileData.avatar = user.avatar || '';
    }
  }

  saveProfile() {
    this.saving.set(true);
    this.saved.set(false);

    this.userService.updateProfile(this.profileData).subscribe({
      next: (updatedUser) => {
        // Update the auth service user signal with new data
        const current = this.authService.user();
        this.authService.user.set({ ...current, ...updatedUser });
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: () => this.saving.set(false)
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.uploading.set(true);
      this.userService.uploadAvatar(file).subscribe({
        next: (response) => {
          this.profileData.avatar = response.avatar;
          // Update local user signal too
          const current = this.authService.user();
          this.authService.user.set({ ...current, avatar: response.avatar });
          this.uploading.set(false);
          this.saved.set(true);
          setTimeout(() => this.saved.set(false), 3000);
        },
        error: (err) => {
          console.error('Upload failed', err);
          this.uploading.set(false);
        }
      });
    }
  }

  logout() {
    this.authService.logout().subscribe();
  }

  setSection(section: string) {
    this.activeSection.set(section);
  }
}
