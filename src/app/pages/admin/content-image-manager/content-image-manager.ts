import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, debounceTime, forkJoin } from 'rxjs';
import { ContentImage, ContentImageService, CONTENT_IMAGE_CATEGORY_OPTIONS, mapContentImageApiItem } from '../../../entities/content-image';
import { SearchRequest } from '../../../core/http/http.models';
import { ResponsiveService } from '../../../core/platform/responsive.service';
import { NotificationService } from '../../../shared/ui/toast/notification.service';
import { ContentImageFormModalComponent } from '../../../features/content-image/content-image-form-modal/content-image-form-modal';

@Component({
  selector: 'app-content-image-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ContentImageFormModalComponent],
  templateUrl: './content-image-manager.html',
  styleUrl: './content-image-manager.css',
})
export class ContentImageManagerComponent implements OnInit {
  private contentImageService = inject(ContentImageService);
  private responsiveService = inject(ResponsiveService);
  private notify = inject(NotificationService);

  images = signal<ContentImage[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  selectedImage = signal<ContentImage | null>(null);
  imageToDelete = signal<ContentImage | null>(null);
  deletingImage = signal<boolean>(false);

  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  categories = CONTENT_IMAGE_CATEGORY_OPTIONS;
  searchTerm = '';
  categoryFilter = 'all';
  statusFilter: 'all' | 'active' | 'inactive' | 'expired' | 'scheduled' = 'all';

  private filterSubject = new Subject<void>();

  constructor() {
    this.filterSubject.pipe(debounceTime(280)).subscribe(() => {
      this.currentPage.set(1);
      this.loadImages();
    });
  }

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      this.loadImages();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.responsiveService.run(() => this.updatePageSize(true));
  }

  updatePageSize(reload: boolean) {
    const width = this.responsiveService.screenWidth();
    let newSize = 12;
    if (width < 768) newSize = 5;
    else if (width < 1100) newSize = 8;

    if (this.pageSize() !== newSize) {
      this.pageSize.set(newSize);
      this.currentPage.set(1);
      if (reload) this.loadImages();
    }
  }

  onFilterChange() {
    this.filterSubject.next();
  }

  clearFilters() {
    this.searchTerm = '';
    this.categoryFilter = 'all';
    this.statusFilter = 'all';
    this.currentPage.set(1);
    this.loadImages();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.loadImages();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadImages();
    }
  }

  loadImages() {
    this.loading.set(true);

    if (this.hasLocalFilters()) {
      this.fetchAllImagesAndFilter();
      return;
    }

    this.contentImageService.search(this.buildSearch(this.currentPage(), this.pageSize())).subscribe({
      next: (res) => {
        if (res?.success && res.value) {
          const items = this.mapItems(res.value.items || []);
          this.images.set(items);
          this.totalItems.set(res.value.totalItems || items.length);
          this.totalPages.set(res.value.totalPages || 1);
        } else {
          this.images.set([]);
          this.totalItems.set(0);
          this.totalPages.set(1);
        }
        this.loading.set(false);
      },
      error: () => {
        this.images.set([]);
        this.loading.set(false);
      },
    });
  }

  openModal(image: ContentImage | null = null) {
    this.selectedImage.set(image);
    this.showModal.set(true);
  }

  closeModal() {
    this.selectedImage.set(null);
    this.showModal.set(false);
  }

  onSaveSuccess() {
    this.closeModal();
    this.loadImages();
  }

  requestDeleteImage(image: ContentImage) {
    if (!image.id) return;
    this.imageToDelete.set(image);
  }

  closeDeleteModal() {
    if (this.deletingImage()) return;
    this.imageToDelete.set(null);
  }

  confirmDeleteImage() {
    const image = this.imageToDelete();
    if (!image?.id || this.deletingImage()) return;

    this.deletingImage.set(true);
    this.contentImageService.delete(image.id).subscribe({
      next: (res) => {
        this.deletingImage.set(false);
        if (res?.success) {
          this.imageToDelete.set(null);
          this.notify.show('success', 'Anuncio eliminado correctamente.');
          this.loadImages();
          return;
        }
        this.notify.show('error', this.extractErrorMessage(res));
      },
      error: (err) => {
        this.deletingImage.set(false);
        this.notify.show('error', this.extractErrorMessage(err?.error));
      },
    });
  }

  categoryLabel(image: ContentImage): string {
    return this.categories.find(category => category.value === image.category)?.label || String(image.category || 'Sin categoria');
  }

  imageSourceLabel(image: ContentImage): string {
    const link = image.link?.trim();
    if (!link) return 'Sin imagen';

    try {
      const host = new URL(link).host.toLowerCase();
      if (host.includes('r2.cloudflarestorage') || host.includes('cloudflare')) return 'Imagen en R2';
      return 'Imagen externa';
    } catch {
      return 'Imagen cargada';
    }
  }

  targetLabel(image: ContentImage): string {
    const target = image.targetLink?.trim() || '#catalogo';
    if (target === '#catalogo' || target.toLowerCase() === 'catalogo') return 'Catalogo';
    return this.compactLink(target);
  }

  dateRangeLabel(image: ContentImage): string {
    const start = this.formatDate(image.startsAt);
    const end = this.formatDate(image.expiresAt);
    if (start && end) return `${start} - ${end}`;
    if (start) return `Desde ${start}`;
    if (end) return `Hasta ${end}`;
    return 'Siempre visible';
  }

  statusLabel(image: ContentImage): string {
    if (!image.active) return 'Inactivo';
    if (this.isExpired(image)) return 'Expirado';
    if (this.isScheduled(image)) return 'Programado';
    return 'Activo';
  }

  statusClass(image: ContentImage): string {
    if (!image.active) return 'inactive';
    if (this.isExpired(image)) return 'expired';
    if (this.isScheduled(image)) return 'scheduled';
    return 'active';
  }

  private hasLocalFilters(): boolean {
    return !!this.searchTerm.trim() || this.categoryFilter !== 'all' || this.statusFilter !== 'all';
  }

  private fetchAllImagesAndFilter() {
    this.contentImageService.search(this.buildSearch(1, 100)).subscribe({
      next: (firstRes) => {
        if (!firstRes?.success || !firstRes.value) {
          this.applyFilteredImages([]);
          return;
        }

        const firstItems = this.mapItems(firstRes.value.items || []);
        const totalPages = firstRes.value.totalPages || 1;

        if (totalPages <= 1) {
          this.applyFilteredImages(firstItems);
          return;
        }

        const requests: Observable<any>[] = [];
        for (let page = 2; page <= totalPages; page++) {
          requests.push(this.contentImageService.search(this.buildSearch(page, 100)));
        }

        forkJoin(requests).subscribe({
          next: (responses) => {
            const allItems = [...firstItems];
            responses.forEach(res => {
              if (res?.success && res.value) {
                allItems.push(...this.mapItems(res.value.items || []));
              }
            });
            this.applyFilteredImages(allItems);
          },
          error: () => this.applyFilteredImages(firstItems),
        });
      },
      error: () => {
        this.images.set([]);
        this.loading.set(false);
      },
    });
  }

  private applyFilteredImages(items: ContentImage[]) {
    const term = this.searchTerm.trim().toLowerCase();
    let filtered = items;

    if (term) {
      filtered = filtered.filter(image =>
        String(image.category || '').toLowerCase().includes(term) ||
        String(image.link || '').toLowerCase().includes(term) ||
        String(image.targetLink || '').toLowerCase().includes(term)
      );
    }

    if (this.categoryFilter !== 'all') {
      filtered = filtered.filter(image => image.category === this.categoryFilter);
    }

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(image => {
        if (this.statusFilter === 'active') return image.active && !this.isExpired(image) && !this.isScheduled(image);
        if (this.statusFilter === 'inactive') return !image.active;
        if (this.statusFilter === 'scheduled') return this.isScheduled(image);
        return this.isExpired(image);
      });
    }

    this.images.set(filtered);
    this.totalItems.set(filtered.length);
    this.totalPages.set(1);
    this.loading.set(false);
  }

  private buildSearch(pageNumber: number, pageSize: number): SearchRequest {
    return {
      pageNumber,
      pageSize,
      orderByField: 'Id',
      orderByAscending: false,
      filters: [],
    };
  }

  private mapItems(items: any[]): ContentImage[] {
    return (items || []).map(mapContentImageApiItem);
  }

  private compactLink(value: string): string {
    try {
      const url = new URL(value);
      const label = `${url.host}${url.pathname === '/' ? '' : url.pathname}`;
      return label.length > 38 ? `${label.slice(0, 35)}...` : label;
    } catch {
      return value.length > 38 ? `${value.slice(0, 35)}...` : value;
    }
  }

  private isExpired(image: ContentImage): boolean {
    if (!image.expiresAt) return false;
    const end = new Date(`${image.expiresAt.slice(0, 10)}T23:59:59`);
    return Number.isFinite(end.getTime()) && end < new Date();
  }

  private isScheduled(image: ContentImage): boolean {
    if (!image.startsAt) return false;
    const start = new Date(`${image.startsAt.slice(0, 10)}T00:00:00`);
    return Number.isFinite(start.getTime()) && start > new Date();
  }

  private formatDate(value: string | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return value.slice(0, 10);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private extractErrorMessage(payload: any): string {
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return payload.errors.filter(Boolean).join(' | ');
    }
    if (typeof payload?.response === 'string' && payload.response.trim()) return payload.response.trim();
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
    return 'No se pudo completar la accion.';
  }
}