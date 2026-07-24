import { AfterViewInit, Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavBarComponent } from '../../layout/nav-bar/nav-bar';
import { Catalog } from '../catalog/catalogo';
import { Features } from '../../features/features';
import { CompanyConfigService } from '../../entities/company-config';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, NavBarComponent, Catalog, Features],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class InicioComponent implements OnInit, AfterViewInit, OnDestroy {
  public configService = inject(CompanyConfigService);
  public showWelcomeFlyer = signal(false);

  private welcomeFlyerTimer?: number;
  private previousBodyOverflow = '';
  private bodyScrollLocked = false;

  ngOnInit() {
    this.configService.getConfig().subscribe();
  }

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      this.welcomeFlyerTimer = window.setTimeout(() => {
        if (!this.configService.maintenanceMode()) {
          this.openWelcomeFlyer();
        }
      }, 700);
    }

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    const revealItems = document.querySelectorAll('.scroll-reveal, .popular-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealItems.forEach(item => observer.observe(item));
  }

  ngOnDestroy() {
    if (this.welcomeFlyerTimer) {
      clearTimeout(this.welcomeFlyerTimer);
    }

    this.unlockBodyScroll();
  }

  @HostListener('document:keydown.escape')
  closeWelcomeFlyerOnEscape() {
    if (this.showWelcomeFlyer()) {
      this.closeWelcomeFlyer();
    }
  }

  openWelcomeFlyer() {
    this.showWelcomeFlyer.set(true);
    this.lockBodyScroll();
  }

  closeWelcomeFlyer() {
    this.showWelcomeFlyer.set(false);
    this.unlockBodyScroll();
  }

  goToCatalog() {
    this.closeWelcomeFlyer();

    if (typeof document === 'undefined') return;

    window.setTimeout(() => {
      document.getElementById('catalogo')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }

  openNovabot() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const launcher = document.getElementById('novasplay-chat-launcher') as HTMLButtonElement | null;
    if (launcher) {
      launcher.click();
      return;
    }

    const tawkApi = (window as any).Tawk_API;
    if (tawkApi?.showWidget) tawkApi.showWidget();
    if (tawkApi?.maximize) tawkApi.maximize();
  }

  private lockBodyScroll() {
    if (typeof document === 'undefined' || this.bodyScrollLocked) return;

    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.bodyScrollLocked = true;
  }

  private unlockBodyScroll() {
    if (typeof document === 'undefined' || !this.bodyScrollLocked) return;

    document.body.style.overflow = this.previousBodyOverflow;
    this.bodyScrollLocked = false;
  }
}
