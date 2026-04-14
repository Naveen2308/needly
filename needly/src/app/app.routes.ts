import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/auth.guard';
import { MainLayout } from './components/main-layout/main-layout';
import { HomeComponent } from './pages/home/home';
import { ExploreComponent } from './pages/explore/explore';
import { LoginPage } from './pages/login-page/login-page';
import { SignupPage } from './pages/signup-page/signup-page';
import { NotificationsComponent } from './pages/notifications/notifications';
import { SettingsComponent } from './pages/settings/settings';
import { ProfileComponent } from './pages/profile/profile';
import { ProductDetailComponent } from './pages/product-detail/product-detail';
import { OtpPage } from './pages/otp-page/otp-page';
import { SubmitPage } from './pages/submit/submit';
import { ForgotPasswordPage } from './pages/forgot-password-page/forgot-password-page';
import { ResetPasswordPage } from './pages/reset-password-page/reset-password-page';

export const routes: Routes = [
  { path: 'login', component: LoginPage, title: 'Login | Needly', canActivate: [loginGuard] },
  { path: 'signup', component: SignupPage, title: 'Signup | Needly' },
  { path: 'otp', component: OtpPage, title: 'Verify OTP | Needly' },
  { path: 'forgot-password', component: ForgotPasswordPage, title: 'Forgot Password | Needly' },
  { path: 'reset-password', component: ResetPasswordPage, title: 'Reset Password | Needly' },
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent, canActivate: [authGuard], title: 'Home | Needly' },
      { path: 'explore', component: ExploreComponent, title: 'Explore | Needly' },
      { path: 'notifications', component: NotificationsComponent, canActivate: [authGuard], title: 'Notifications | Needly' },
      { path: 'settings', component: SettingsComponent, canActivate: [authGuard], title: 'Settings | Needly' },
      { path: 'profile/:id', component: ProfileComponent, title: 'Profile | Needly' },
      { path: 'product/:id', component: ProductDetailComponent, title: 'Product | Needly' },
      { path: 'submit', component: SubmitPage, canActivate: [authGuard], title: 'Submit Product | Needly' }
    ]
  },
  { path: '**', redirectTo: 'home' }
];
