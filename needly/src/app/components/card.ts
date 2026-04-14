import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'bg-white p-8 md:p-12 border border-black/10 rounded-none ' + customClass()">
      <ng-content></ng-content>
      <div *ngIf="footer()" class="mt-10">
        <ng-content select="[footer]"></ng-content>
      </div>
    </div>
  `
})
export class CardComponent {
  footer = input<boolean>(false);
  customClass = input<string>('');
}
