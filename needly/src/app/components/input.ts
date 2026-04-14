import { Component, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div [class]="'flex flex-col gap-2 ' + containerClass()">
      <label *ngIf="label()" [for]="id()" class="block text-[0.625rem] font-black text-black uppercase tracking-[0.15em] ml-1">
        {{ label() }}
      </label>
      <div class="relative">
        <input
          [id]="id()"
          [type]="type()"
          [placeholder]="placeholder()"
          [(ngModel)]="value"
          class="block w-full px-4 py-3 text-black bg-neutral-50 border border-neutral-200 rounded-none focus:border-black focus:ring-0 outline-none transition-all duration-200 placeholder:text-neutral-300 text-sm"
        />
        <ng-content select="[suffix]"></ng-content>
      </div>
      <p *ngIf="error()" class="text-[0.625rem] text-red-600 font-bold uppercase tracking-wider mt-1">{{ error() }}</p>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    input, label { font-family: 'Inter', sans-serif; }
  `]
})
export class InputComponent {
  id = input<string>('input-' + Math.random().toString(36).substr(2, 9));
  label = input<string>('');
  type = input<string>('text');
  placeholder = input<string>('');
  value = model<string>('');
  error = input<string>('');
  containerClass = input<string>('');
}
