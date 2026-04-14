import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      (click)="onClick.emit($event)"
      [ngClass]="{
        'w-full flex items-center justify-center gap-3 px-4 py-4 font-bold text-xs uppercase tracking-[0.2em] transition-all duration-200 rounded-none': true,
        'bg-black text-white hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed': variant() === 'primary',
        'bg-white text-black border border-black hover:bg-neutral-50 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed': variant() === 'secondary'
      }"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    button { font-family: 'Manrope', sans-serif; }
  `]
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary'>('primary');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input<boolean>(false);
  onClick = output<MouseEvent>();
}
