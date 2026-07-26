import { AfterViewInit, Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { NavBarComponent } from '../../layout/nav-bar/nav-bar';
import { Catalog } from '../catalog/catalogo';
import { Features } from '../../features/features';
import { CompanyConfigService } from '../../entities/company-config';
import { ContentImage, ContentImageCategory, ContentImageService } from '../../entities/content-image';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, NavBarComponent, Catalog, Features],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class InicioComponent implements OnInit, AfterViewInit, OnDestroy {
  public configService = inject(CompanyConfigService);
  private contentImageService = inject(ContentImageService);

  public showWelcomeFlyer = signal(false);
  public showAnnouncementPopup = signal(false);
  public announcementImages = signal<ContentImage[]>([]);
  public activeAnnouncementIndex = signal(0);
  public announcementImageLayout = signal<'portrait' | 'square' | 'landscape'>('portrait');
  public activeAnnouncement = computed(() => this.announcementImages()[this.activeAnnouncementIndex()] || null);

  private initialPopupTimer?: number;
  private initialPopupReady = false;
  private initialPopupOpened = false;
  private announcementsLoaded = false;
  private previousBodyOverflow = '';
  private bodyScrollLocked = false;

  ngOnInit() {
    this.configService.getConfig().subscribe();
    this.loadAnnouncements();
  }

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      this.initialPopupTimer = window.setTimeout(() => {
        this.initialPopupReady = true;
        this.tryOpenInitialPopup();
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
    if (this.initialPopupTimer) {
      clearTimeout(this.initialPopupTimer);
    }

    this.unlockBodyScroll();
  }

  @HostListener('document:keydown.escape')
  closePopupOnEscape() {
    if (this.showAnnouncementPopup()) {
      this.closeAnnouncementPopup();
      return;
    }

    if (this.showWelcomeFlyer()) {
      this.closeWelcomeFlyer();
    }
  }

  openWelcomeFlyer() {
    this.showAnnouncementPopup.set(false);
    this.showWelcomeFlyer.set(true);
    this.lockBodyScroll();
  }

  closeWelcomeFlyer() {
    this.showWelcomeFlyer.set(false);
    this.unlockBodyScroll();
  }

  openAnnouncementPopup() {
    if (this.announcementImages().length === 0) {
      this.openWelcomeFlyer();
      return;
    }

    this.showWelcomeFlyer.set(false);
    this.activeAnnouncementIndex.set(0);
    this.showAnnouncementPopup.set(true);
    this.lockBodyScroll();
  }

  closeAnnouncementPopup() {
    this.showAnnouncementPopup.set(false);
    this.unlockBodyScroll();
  }

  nextAnnouncement() {
    const total = this.announcementImages().length;
    if (total <= 1) return;
    this.announcementImageLayout.set('portrait');
    this.activeAnnouncementIndex.update(index => (index + 1) % total);
  }

  previousAnnouncement() {
    const total = this.announcementImages().length;
    if (total <= 1) return;
    this.announcementImageLayout.set('portrait');
    this.activeAnnouncementIndex.update(index => (index - 1 + total) % total);
  }

  selectAnnouncement(index: number) {
    if (index < 0 || index >= this.announcementImages().length) return;
    this.activeAnnouncementIndex.set(index);
  }

  syncAnnouncementImageLayout(event: Event) {
    const image = event.target as HTMLImageElement | null;
    if (!image?.naturalWidth || !image?.naturalHeight) return;

    const ratio = image.naturalWidth / image.naturalHeight;
    if (ratio >= 1.2) {
      this.announcementImageLayout.set('landscape');
      return;
    }

    if (ratio >= 0.82) {
      this.announcementImageLayout.set('square');
      return;
    }

    this.announcementImageLayout.set('portrait');
  }
  goToCatalog() {
    this.showWelcomeFlyer.set(false);
    this.showAnnouncementPopup.set(false);
    this.unlockBodyScroll();
    this.scrollToCatalog();
  }

  openAnnouncementTarget(announcement: ContentImage | null) {
    const target = announcement?.targetLink?.trim() || '#catalogo';
    this.showWelcomeFlyer.set(false);
    this.showAnnouncementPopup.set(false);
    this.unlockBodyScroll();

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    if (target === '#catalogo' || target.toLowerCase() === 'catalogo') {
      this.scrollToCatalog();
      return;
    }

    if (target.startsWith('#')) {
      window.setTimeout(() => {
        try {
          document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          this.scrollToCatalog();
        }
      }, 80);
      return;
    }

    window.location.href = target;
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

  private scrollToCatalog() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    window.setTimeout(() => {
      document.getElementById('catalogo')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }

  private loadAnnouncements() {
    this.contentImageService.getActiveByCategory(ContentImageCategory.Announcements)
      .pipe(finalize(() => {
        this.announcementsLoaded = true;
        this.tryOpenInitialPopup();
      }))
      .subscribe({
        next: (res) => {
          const items = (res?.value || []).filter(item => !!item.link);
          this.announcementImages.set(items);
        },
        error: () => this.announcementImages.set([]),
      });
  }

  private tryOpenInitialPopup() {
    if (typeof window === 'undefined') return;
    if (!this.initialPopupReady || !this.announcementsLoaded || this.initialPopupOpened) return;
    if (this.configService.maintenanceMode()) return;

    this.initialPopupOpened = true;
    if (this.announcementImages().length > 0) {
      this.openAnnouncementPopup();
      return;
    }

    this.openWelcomeFlyer();
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
