import { Component, OnInit, OnDestroy, inject, signal, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService, Product } from '../../entities/product';
import { ResponsiveService } from '../../core/platform/responsive.service';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css'
})
export class Catalog implements OnInit, OnDestroy {
  private router = inject(Router);
  private productService = inject(ProductService);
  private responsiveService = inject(ResponsiveService);

  juegos = signal<Product[]>([]);
  allJuegos = signal<Product[]>([]);
  cargando = signal<boolean>(true);
  searchTerm = signal<string>('');
  @Input() isMaintenance = false;

  currentPage = signal<number>(1);
  pageSize = signal<number>(8);
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  private revealObserver?: IntersectionObserver;

  @HostListener('window:resize')
  onResize() {
    this.responsiveService.run(() => this.updatePageSize());
  }

  @HostListener('window:novasplay:catalog-search', ['$event'])
  onCatalogSearch(event: Event) {
    const detail = event instanceof CustomEvent ? event.detail : '';
    this.searchTerm.set((detail || '').trim());
    this.currentPage.set(1);
    this.aplicarPaginacionLocal();
  }

  ngOnInit() {
    this.updatePageSize();
    if (this.responsiveService.isBrowser) {
      this.cargarJuegos();
    }
  }

  ngOnDestroy() {
    this.revealObserver?.disconnect();
  }

  updatePageSize() {
    const width = this.responsiveService.screenWidth();
    let newSize = 8;

    if (width < 600) {
      newSize = 4;
    } else if (width < 1024) {
      newSize = 6;
    }

    if (newSize !== this.pageSize()) {
      this.pageSize.set(newSize);
      this.currentPage.set(1);
      this.aplicarPaginacionLocal();
    }
  }

  cargarJuegos() {
    this.cargando.set(true);
    this.productService.searchHomeProducts().subscribe({
      next: (res) => {
        if (res?.success && res.value) {
          const todosLosproductos = (res.value.items as any[]).map(p => {
            const urlExtraida = this.normalizeAssetUrl(p.ImageURL || p.imageURL || p.imageUrl || p.ImageInfo?.ImageURL || p.imageInfo?.imageURL || '');
            const iconExtraido = this.normalizeAssetUrl(p.IconURL || p.iconURL || p.iconUrl || p.IconInfo?.IconURL || p.iconInfo?.iconURL || p.ImageInfo?.IconURL || p.imageInfo?.iconURL || '');

            return {
              id: p.Id || p.id,
              name: p.Name || p.name,
              description: p.Description || p.description,
              timeMinRecharge: p.TimeMinDetail || '00:05:00',
              timeMaxRecharge: p.TimeMaxDetail || '00:15:00',
              soldOut: p.SoldOut || p.soldOut || false,
              createdAt: p.CreatedAt || p.createdAt || p.CreatedDate || p.createdDate || p.CreationDate || p.creationDate,
              imageInfo: urlExtraida || iconExtraido ? { imageURL: urlExtraida, iconURL: iconExtraido } : undefined,
              iconInfo: iconExtraido ? { iconURL: iconExtraido } : undefined,
              categories: Array.isArray(p.ProductsCategories_Category_Name) ? p.ProductsCategories_Category_Name : (p.ProductsCategories_Category_Name ? [p.ProductsCategories_Category_Name] : [])
            };
          });

          this.allJuegos.set(todosLosproductos);
          this.aplicarPaginacionLocal();
        }
        this.cargando.set(false);
      },
      error: () => {
        this.allJuegos.set([]);
        this.aplicarPaginacionLocal();
        this.cargando.set(false);
      }
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

  private aplicarPaginacionLocal() {
    const term = this.searchTerm().toLowerCase();
    const all = term
      ? this.allJuegos().filter(juego => {
          const searchable = [
            juego.name,
            juego.description,
            ...(juego.categories || [])
          ].join(' ').toLowerCase();
          return searchable.includes(term);
        })
      : this.allJuegos();
    const size = this.pageSize();
    const total = all.length;
    const pages = Math.max(1, Math.ceil(total / size));

    if (this.currentPage() > pages) {
      this.currentPage.set(pages);
    }

    const start = (this.currentPage() - 1) * size;
    const end = start + size;

    this.totalItems.set(total);
    this.totalPages.set(pages);
    this.juegos.set(all.slice(start, end));
    this.observeVisibleCards();
  }

  private observeVisibleCards() {
    if (!this.responsiveService.isBrowser) return;

    window.setTimeout(() => {
      const cards = document.querySelectorAll('#catalog-section .popular-card:not(.is-visible)');
      if (!cards.length) return;

      if (typeof IntersectionObserver === 'undefined') {
        cards.forEach(card => card.classList.add('is-visible'));
        return;
      }

      this.revealObserver?.disconnect();
      this.revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.revealObserver?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

      cards.forEach(card => this.revealObserver?.observe(card));
    }, 0);
  }

  formatWaitTime(timeStr: string): string {
    if (!timeStr) return '0 min';
    const [h, m] = timeStr.split(':').map(val => parseInt(val) || 0);
    if (h === 0 && m === 0) return 'Inmediato';
    let result = '';
    if (h > 0) result += `${h}h `;
    if (m > 0 || h === 0) result += `${m} min`;
    return result.trim();
  }

  cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPages()) {
      this.currentPage.set(nuevaPagina);
      this.aplicarPaginacionLocal();

      this.responsiveService.run(() => {
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  get paginas() {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  isProductNew(juego: Product): boolean {
    const rawDate = juego.createdAt || juego.createdDate || juego.creationDate;
    if (!rawDate) return false;

    const createdTime = new Date(rawDate).getTime();
    if (Number.isNaN(createdTime)) return false;

    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - createdTime <= sevenDays;
  }

  getDisplayIcon(juego: Product): string {
    return juego.iconInfo?.iconURL || juego.imageInfo?.iconURL || juego.imageInfo?.imageURL || '';
  }

  irACheckout(juego: Product) {
    if (this.isMaintenance) return;
    if (juego.id && !juego.soldOut) {
      this.router.navigate(['/checkout', juego.id]);
    }
  }
}
