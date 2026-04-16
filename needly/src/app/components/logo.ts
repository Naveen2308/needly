import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'flex items-center ' + customClass()">
      <ng-container [ngSwitch]="variant()">
        
        <!-- Modern N Logo Asset -->
        <svg *ngSwitchCase="'short'" viewBox="0 25 80 70" xmlns="http://www.w3.org/2000/svg" class="h-10 w-auto object-contain">
          <style>
            .logo-text { font-family: 'Space Grotesk', 'Manrope', sans-serif; font-weight: 800; }
          </style>
          <rect x="10" y="30" width="60" height="60" rx="14" fill="#000000"/>
          <text x="40" y="65" text-anchor="middle" class="logo-text" font-size="50" fill="#ffffff" dominant-baseline="middle">N</text>
        </svg>

        <!-- Needly Logo With Text Asset -->
        <div *ngSwitchCase="'long'" class="flex items-center gap-2">
          <svg viewBox="0 25 240 70" xmlns="http://www.w3.org/2000/svg" class="h-14 w-auto object-contain">
            <style>
              .logo-text { font-family: 'Space Grotesk', 'Manrope', sans-serif; font-weight: 800; }
            </style>
            <rect x="10" y="30" width="60" height="60" rx="14" fill="#000000"/>
            <text x="40" y="65" text-anchor="middle" class="logo-text" font-size="50" fill="#ffffff" dominant-baseline="middle">N</text>
            <text x="75" y="65" class="logo-text" font-size="42" fill="#000000" dominant-baseline="middle">EEDLY</text>
          </svg>
        </div>

        <!-- Responsive Logo Asset -->
        <div *ngSwitchCase="'responsive'" class="flex items-center">
          <svg viewBox="0 25 80 70" xmlns="http://www.w3.org/2000/svg" class="h-10 w-auto object-contain md:hidden">
            <style>
              .logo-text { font-family: 'Space Grotesk', 'Manrope', sans-serif; font-weight: 800; }
            </style>
            <rect x="10" y="30" width="60" height="60" rx="14" fill="#000000"/>
            <text x="40" y="65" text-anchor="middle" class="logo-text" font-size="50" fill="#ffffff" dominant-baseline="middle">N</text>
          </svg>

          <svg viewBox="0 25 240 70" xmlns="http://www.w3.org/2000/svg" class="h-14 w-auto object-contain hidden md:block">
            <style>
              .logo-text { font-family: 'Space Grotesk', 'Manrope', sans-serif; font-weight: 800; }
            </style>
            <rect x="10" y="30" width="60" height="60" rx="14" fill="#000000"/>
            <text x="40" y="65" text-anchor="middle" class="logo-text" font-size="50" fill="#ffffff" dominant-baseline="middle">N</text>
            <text x="75" y="64" class="logo-text" font-size="42" fill="#000000" dominant-baseline="middle">EEDLY</text>
          </svg>
        </div>
        
      </ng-container>
    </div>
  `
})
export class LogoComponent {
  variant = input<'short' | 'long' | 'responsive'>('short');
  customClass = input<string>('');
}

