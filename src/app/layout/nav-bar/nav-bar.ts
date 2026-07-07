import { Component, signal, inject, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../entities/product';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav-bar.html',
  styleUrls: ['./nav-bar.css'],
})
export class NavBarComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private router = inject(Router);
  private subscripcion: any;

  imagenActiva = signal<any>({ title: 'Cargando...', desc: 'Obteniendo juegos disponibles...' });
  heroProgressVisible = signal(false);
  Imagenes: any[] = [];
  @ViewChild('heroDeck') heroDeck?: ElementRef<HTMLElement>;
  private currentRealIndex = 0;
  private heroActivationId = 0;
  private autoplayTimer?: ReturnType<typeof setTimeout>;
  private preloadedImages = new Map<string, Promise<void>>();
  readonly heroAutoplayDelay = 6800;
  private readonly heroTransitionMs = 1300;

  ngOnInit() {
    this.cargarJuegos();
    this.subscripcion = this.productService.productsChanged.subscribe(() => {
      this.cargarJuegos();
    });
  }

  ngOnDestroy() {
    if (this.subscripcion) {
      this.subscripcion.unsubscribe();
    }
    this.pauseHeroAutoplay();
  }

  cargarJuegos() {
    this.productService.searchHomeProducts().subscribe({
      next: (res) => {
        if (res?.success && res.value && res.value.items) {
          const productos = res.value.items as any[];
          const allItems = productos
            .filter(p => !p.SoldOut)
            .map(p => {
              let urlExtraida = this.normalizeAssetUrl(p.ImageURL || p.imageURL || p.imageUrl || p.ImageInfo?.ImageURL || p.imageInfo?.imageURL || '');
              const iconExtraido = this.normalizeAssetUrl(p.IconURL || p.iconURL || p.iconUrl || p.IconInfo?.IconURL || p.iconInfo?.iconURL || p.ImageInfo?.IconURL || p.imageInfo?.iconURL || '');

              if (!urlExtraida || urlExtraida.length < 10) {
                urlExtraida = 'Blood.jpg';
              }

              return {
                id: p.Id || p.id,
                url: urlExtraida,
                iconUrl: iconExtraido || urlExtraida,
                title: p.Name || p.name,
                desc: p.Description || p.description || 'Domina el campo de batalla con las mejores recargas.'
              };
            });

          this.setHeroItems(allItems.length ? this.shuffleArray(allItems).slice(0, 10) : []);
        }
      },
      error: () => this.setHeroItems([]),
    });
  }

  private normalizeAssetUrl(value: string): string {
    let cleanUrl = (value || '').trim();
    if (!cleanUrl) return '';

    cleanUrl = cleanUrl.replace(/^https?:\/\/(https?:\/\/)?/, 'https://');
    if (cleanUrl.startsWith('https//')) cleanUrl = 'https://' + cleanUrl.slice(7);
    cleanUrl = cleanUrl.replace('.dev//', '.dev/');

    return cleanUrl;
  }

  goToDetails(id: number) {
    if (id > 0) {
      this.router.navigate(['/checkout', id]);
    }
  }

  scrollToCatalog() {
    const catalog = document.getElementById('catalog-section');
    if (!catalog) return;

    catalog.scrollIntoView({ behavior: 'smooth', block: 'start' });
    catalog.classList.remove('catalog-focus-pulse');
    window.setTimeout(() => catalog.classList.add('catalog-focus-pulse'), 420);
  }

  selectHeroItem(item: any, index: number) {
    this.pauseHeroAutoplay();
    this.currentRealIndex = index;
    this.moveDeckTo(index, this.heroTransitionMs);
    this.activateHero(item).then(() => this.startHeroAutoplay());
  }

  isActiveHero(item: any): boolean {
    return this.isSameHero(this.imagenActiva(), item);
  }

  private setHeroItems(items: any[]) {
    this.Imagenes = items;
    this.preloadHeroImages(items);
    Promise.resolve().then(() => {
      this.moveDeckTo(0, 0);
      this.activateHero(this.Imagenes[0], false).then(() => this.startHeroAutoplay());
    });
  }

  private preloadHeroImages(items: any[]) {
    items.forEach(item => {
      this.loadHeroImage(item?.url);
    });
  }

  private loadHeroImage(url?: string): Promise<void> {
    if (!url || typeof Image === 'undefined') {
      return Promise.resolve();
    }

    const cached = this.preloadedImages.get(url);
    if (cached) {
      return cached;
    }

    const img = new Image();
    img.decoding = 'async';
    img.src = url;

    const promise = new Promise<void>((resolve) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
        return;
      }

      const done = () => resolve();
      img.onload = done;
      img.onerror = done;
    }).then(() => {
      if (typeof img.decode !== 'function') return;
      return img.decode().catch(() => undefined);
    }).then(() => undefined);

    this.preloadedImages.set(url, promise);
    return promise;
  }

  startHeroAutoplay() {
    this.pauseHeroAutoplay();
    if (this.Imagenes.length <= 1) return;

    this.autoplayTimer = setTimeout(() => {
      const active = this.imagenActiva();
      const activeIndex = this.Imagenes.findIndex(item => this.isSameHero(active, item));
      const baseIndex = activeIndex >= 0 ? activeIndex : this.currentRealIndex;
      const nextIndex = (baseIndex + 1) % this.Imagenes.length;
      const nextItem = this.Imagenes[nextIndex];
      if (!nextItem) return;

      this.currentRealIndex = nextIndex;
      this.moveDeckTo(nextIndex, this.heroTransitionMs);
      this.activateHero(nextItem).then(() => this.startHeroAutoplay());
    }, this.heroAutoplayDelay);
  }

  pauseHeroAutoplay() {
    if (this.autoplayTimer) {
      clearTimeout(this.autoplayTimer);
      this.autoplayTimer = undefined;
    }
  }

  private activateHero(item: any, animate = true): Promise<void> {
    if (!item) return Promise.resolve();

    const activationId = ++this.heroActivationId;

    if (!animate) {
      this.imagenActiva.set(item);
      this.restartHeroProgress();
      return Promise.resolve();
    }

    return this.loadHeroImage(item.url).then(() => {
      if (activationId !== this.heroActivationId) return;

      const scheduleFrame = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0);

      return new Promise<void>((resolve) => {
        scheduleFrame(() => {
          if (activationId === this.heroActivationId) {
            this.imagenActiva.set(item);
            this.restartHeroProgress();
          }
          resolve();
        });
      });
    });
  }

  private restartHeroProgress() {
    this.heroProgressVisible.set(false);
    if (this.Imagenes.length <= 1) return;

    const scheduleFrame = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0);

    scheduleFrame(() => {
      scheduleFrame(() => this.heroProgressVisible.set(true));
    });
  }

  private isSameHero(first: any, second: any): boolean {
    if (!first || !second) return false;

    if (first.id || second.id) {
      return first.id === second.id;
    }

    return first.url === second.url;
  }

  private moveDeckTo(index: number, speed: number) {
    const track = this.heroDeck?.nativeElement;
    const card = track?.querySelectorAll<HTMLElement>('.deck-card')?.[index];
    if (!track || !card) return;

    const targetLeft = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: speed > 0 ? 'smooth' : 'auto',
    });
  }

  private shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
