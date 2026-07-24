import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `<div class="auth-callback-loader">Verificando inicio de sesion...</div>`,
  styles: [`
    .auth-callback-loader {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
      color: var(--text);
      font-size: 1.1rem;
      font-weight: 800;
      text-align: center;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = this.readGoogleToken(params);
      const returnPath = this.authService.consumeGoogleReturnPath();

      if (token && typeof localStorage !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('CookieTokenClaims', token);
        this.authService.authChanged.next();
      }

      this.router.navigateByUrl(returnPath || '/', { replaceUrl: true });
    });
  }

  private readGoogleToken(params: Params): string {
    const raw = params['token'] ?? params['claims'] ?? params['CookieTokenClaims'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) return '';

    const trimmed = String(value).trim().replace(/^"|"$/g, '');
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  }
}
