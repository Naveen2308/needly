import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../components/card';
import { ButtonComponent } from '../../components/button';
import { LogoComponent } from '../../components/logo';

@Component({
  selector: 'app-otp-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent, LogoComponent],
  templateUrl: './otp-page.html',
  styleUrl: './otp-page.css',
})
export class OtpPage {
  // Array to hold OTP digits
  otpDigits = new Array(6).fill('');

  onDigitInput(event: any, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value && index < 5) {
      // Focus next input
      const nextInput = input.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement;
      nextInput?.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    const target = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      const prevInput = target.parentElement?.previousElementSibling?.querySelector('input') as HTMLInputElement;
      prevInput?.focus();
    }
  }
}
