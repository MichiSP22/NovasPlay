import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, Event, ActivatedRoute } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { Auth } from './features/auth/auth-modal/auth';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/auth/auth.service';
import { ToastComponent } from './shared/ui/toast/toast';
import { GenericResponse } from './core/http/http.models';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, Header, Footer, Auth, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('NovasPlay');
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private document = inject(DOCUMENT);
  private meta = inject(Meta);
  private titleService = inject(Title);
  private readonly canonicalOrigin = 'https://novasplay.neocharge.app';

  showAuthModal = false;
  isLoginMode = true;
  showLayout = false;
  private sessionRefreshed = false;

  constructor(private authService: AuthService) {
    this.updateLayoutVisibility(this.getCurrentUrl());

    this.router.events
      .pipe(filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateLayoutVisibility(event.urlAfterRedirects);
        this.updateSeo(event.urlAfterRedirects);
      });

    this.authService.openAuthModal.subscribe((mode: 'login' | 'register') => {
      this.handleAuthOpen(mode);
    });
  }

  ngOnInit() {
    this.updateLayoutVisibility(this.getCurrentUrl());
    this.updateSeo(this.getCurrentUrl());
    this.checkUrlClaims();
    this.validarEntrada();
  }

  private updateLayoutVisibility(url: string) {
    this.showLayout = !url.includes('/admin');
  }

  private updateSeo(url: string) {
    const cleanPath = this.getCleanPath(url);
    const isTerms = cleanPath === '/terms-view';
    const isHome = cleanPath === '/';
    const isIndexable = isHome || isTerms;
    const canonicalUrl = `${this.canonicalOrigin}${isHome ? '/' : cleanPath}`;

    this.setCanonical(canonicalUrl);
    this.meta.updateTag({
      name: 'robots',
      content: isIndexable
        ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
        : 'noindex,follow,max-image-preview:large',
    });

    if (isTerms) {
      this.titleService.setTitle('Terminos y condiciones | NovasPlay');
      this.meta.updateTag({
        name: 'description',
        content: 'Consulta los terminos y condiciones de uso de NovasPlay para compras, pagos y recargas online.',
      });
      return;
    }

    this.titleService.setTitle('NovasPlay | Recargas Online');
    this.meta.updateTag({
      name: 'description',
      content: 'NovasPlay es una plataforma de recargas online para juegos, con catalogo gamer, pagos verificados y soporte directo.',
    });
  }

  private getCleanPath(url: string): string {
    const path = (url || '/').split('?')[0].split('#')[0] || '/';
    return path === '' ? '/' : path;
  }

  private setCanonical(url: string) {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private getCurrentUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.pathname}${window.location.search}${window.location.hash}`;
    }
    return this.router.url || '';
  }

  private checkUrlClaims() {
    this.route.queryParams.subscribe((params: Record<string, string | undefined>) => {
      let claims = params['claims'];
      if (claims) {
        claims = claims.replace(/^"|"$/g, '');
        localStorage.setItem('CookieTokenClaims', decodeURIComponent(claims));
        this.router
          .navigate([], {
            queryParams: { claims: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          })
          .then(() => {
            this.authService.authChanged.next();
          });
      }
    });
  }

  validarEntrada() {
    if (this.sessionRefreshed) return;
    const hasToken =
      typeof document !== 'undefined' &&
      (document.cookie.includes('CookieTokenClaims') || localStorage.getItem('CookieTokenClaims'));
    if (!hasToken) return;

    this.sessionRefreshed = true;
    this.authService.refreshSession().subscribe({
      next: (response: GenericResponse<string>) => {
        const claims = response?.value;
        if (claims) localStorage.setItem('CookieTokenClaims', claims);
      },
      error: () => {},
    });
  }

  handleAuthOpen(mode: 'login' | 'register') {
    this.isLoginMode = mode === 'login';
    this.showAuthModal = true;
    document.body.style.overflow = 'hidden';
  }

  handleAuthClose() {
    this.showAuthModal = false;
    document.body.style.overflow = 'auto';
  }
}
