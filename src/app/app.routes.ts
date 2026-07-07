import { Routes } from '@angular/router';
import { InicioComponent } from './pages/home/inicio';
import { Chekout } from './pages/checkout/chekout';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { UserProfileComponent } from './pages/user-profile/user-profile';
import { adminGuard } from './core/auth/admin.guard';
import { APP_PATHS } from './routes/app-paths';

export const routes: Routes = [
  { path: APP_PATHS.home, component: InicioComponent },
  { path: APP_PATHS.checkout, component: Chekout },
  { path: APP_PATHS.cartCheckout, loadComponent: () => import('./pages/cart-checkout/cart-checkout').then(c => c.CartCheckoutComponent) },
  {
    path: APP_PATHS.admin,
    canActivate: [adminGuard], 
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard').then(c => c.AdminDashboard)
  }, 
  { path: APP_PATHS.profile, component: UserProfileComponent },
  { path: APP_PATHS.authGoogleCallback, loadComponent: () => import('./pages/auth/auth-callback/auth-callback').then(c => c.AuthCallbackComponent) },
  { path: APP_PATHS.terms, loadComponent: () => import('./pages/terms/terms-page').then(c => c.TermsPageComponent) },
  { path: APP_PATHS.wildcard, redirectTo: APP_PATHS.home },
];
