import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `<div class="auth-callback-loader">Verificando inicio de sesión...</div>`,
  styles: [`
    .auth-callback-loader {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--text);
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('CookieTokenClaims', token);
        this.authService.authChanged.next();
      }
      
      this.router.navigate(['/']); // Redirect to inicio
    });
  }
}
