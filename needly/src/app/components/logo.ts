import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'flex flex-col items-center ' + customClass()">
      <ng-container [ngSwitch]="variant()">
        
        <!-- Modern N Logo Asset -->
        <img *ngSwitchCase="'short'" src="/logo-short.png" class="h-8 w-8 object-contain" alt="Logo Short">

        <!-- Needly Logo With Text Asset -->
        <div *ngSwitchCase="'long'" class="flex items-center gap-2">
             <img src="/logo.png" class="h-16 w-auto object-contain" alt="Needly Logo">
        </div>

        <!-- Responsive Logo Asset -->
        <div *ngSwitchCase="'responsive'" class="flex items-center">
             <img src="/logo-short.png" class="h-8 w-auto object-contain md:hidden" alt="Short Logo">
             <img src="/logo.png" class="h-14 w-auto object-contain hidden md:block" alt="Full Logo">
        </div>
        
      </ng-container>
    </div>
  `
})
export class LogoComponent {
  variant = input<'short' | 'long' | 'responsive'>('short');
  customClass = input<string>('');
}
