import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, debounceTime, forkJoin } from 'rxjs';
import { Coupon, CouponService, mapCouponApiItem } from '../../../entities/coupon';
import { SearchRequest } from '../../../core/http/http.models';
import { ResponsiveService } from '../../../core/platform/responsive.service';
import { CouponFormModalComponent } from '../../../features/coupon/coupon-form-modal/coupon-form-modal';

@Component({
  selector: 'app-coupon-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, CouponFormModalComponent],
  templateUrl: './coupon-manager.html',
  styleUrl: './coupon-manager.css',
})
export class CouponManagerComponent implements OnInit {
  private couponService = inject(CouponService);
  private responsiveService = inject(ResponsiveService);

  coupons = signal<Coupon[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  selectedCoupon = signal<Coupon | null>(null);

  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  searchTerm = '';
  statusFilter: 'all' | 'active' | 'inactive' | 'expired' = 'all';
  typeFilter: 'all' | 'percent' | 'fixed' = 'all';

  private filterSubject = new Subject<void>();

  constructor() {
    this.filterSubject.pipe(debounceTime(300)).subscribe(() => {
      this.currentPage.set(1);
      this.loadCoupons();
    });
  }

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      this.loadCoupons();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.responsiveService.run(() => this.updatePageSize(true));
  }

  updatePageSize(reload: boolean) {
    const width = this.responsiveService.screenWidth();
    let newSize = 15;
    if (width < 768) newSize = 5;
    else if (width < 1024) newSize = 10;

    if (this.pageSize() !== newSize) {
      this.pageSize.set(newSize);
      this.currentPage.set(1);
      if (reload) this.loadCoupons();
    }
  }

  onFilterChange() {
    this.filterSubject.next();
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.typeFilter = 'all';
    this.currentPage.set(1);
    this.loadCoupons();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.loadCoupons();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadCoupons();
    }
  }

  loadCoupons() {
    this.loading.set(true);

    if (this.hasLocalFilters()) {
      this.fetchAllCouponsAndFilter();
      return;
    }

    this.couponService.search(this.buildSearch(this.currentPage(), this.pageSize())).subscribe({
      next: (res) => {
        if (res?.success && res.value) {
          const items = this.mapItems(res.value.items || res.value || []);
          this.coupons.set(items);
          this.totalItems.set(res.value.totalItems || items.length);
          this.totalPages.set(res.value.totalPages || 1);
        } else {
          this.coupons.set([]);
          this.totalItems.set(0);
          this.totalPages.set(1);
        }
        this.loading.set(false);
      },
      error: () => {
        this.coupons.set([]);
        this.loading.set(false);
      },
    });
  }

  openModal(coupon: Coupon | null = null) {
    this.selectedCoupon.set(coupon);
    this.showModal.set(true);
  }

  closeModal() {
    this.selectedCoupon.set(null);
    this.showModal.set(false);
  }

  onSaveSuccess() {
    this.closeModal();
    this.loadCoupons();
  }

  deleteCoupon(id: number | undefined) {
    if (!id || !confirm('Seguro que deseas eliminar este cupon?')) return;
    this.couponService.delete(id).subscribe(() => this.loadCoupons());
  }

  discountLabel(coupon: Coupon): string {
    if (coupon.discountType === 0) return `${this.formatNumber(coupon.value)}%`;
    return this.formatMoney(coupon.value);
  }

  dateRangeLabel(coupon: Coupon): string {
    const start = this.formatDate(coupon.startDate);
    const end = this.formatDate(coupon.endDate);
    if (start && end) return `${start} - ${end}`;
    if (start) return `Desde ${start}`;
    if (end) return `Hasta ${end}`;
    return 'Sin vigencia definida';
  }

  statusLabel(coupon: Coupon): string {
    if (!coupon.active) return 'Inactivo';
    if (this.isExpired(coupon)) return 'Expirado';
    if (this.isPending(coupon)) return 'Programado';
    return 'Activo';
  }

  statusClass(coupon: Coupon): string {
    if (!coupon.active) return 'inactive';
    if (this.isExpired(coupon)) return 'expired';
    if (this.isPending(coupon)) return 'pending';
    return 'active';
  }

  usageLabel(coupon: Coupon): string {
    const used = coupon.usageCount || 0;
    return coupon.usageLimit ? `${used}/${coupon.usageLimit}` : `${used}/Ilimitado`;
  }

  private hasLocalFilters(): boolean {
    return !!this.searchTerm.trim() || this.statusFilter !== 'all' || this.typeFilter !== 'all';
  }

  private fetchAllCouponsAndFilter() {
    this.couponService.search(this.buildSearch(1, 100)).subscribe({
      next: (firstRes) => {
        if (!firstRes?.success || !firstRes.value) {
          this.applyFilteredCoupons([]);
          return;
        }

        const firstItems = this.mapItems(firstRes.value.items || firstRes.value || []);
        const totalPages = firstRes.value.totalPages || 1;

        if (totalPages <= 1) {
          this.applyFilteredCoupons(firstItems);
          return;
        }

        const requests: Observable<any>[] = [];
        for (let page = 2; page <= totalPages; page++) {
          requests.push(this.couponService.search(this.buildSearch(page, 100)));
        }

        forkJoin(requests).subscribe({
          next: (responses) => {
            const allItems = [...firstItems];
            responses.forEach(res => {
              if (res?.success && res.value) {
                allItems.push(...this.mapItems(res.value.items || res.value || []));
              }
            });
            this.applyFilteredCoupons(allItems);
          },
          error: () => this.applyFilteredCoupons(firstItems),
        });
      },
      error: () => {
        this.coupons.set([]);
        this.loading.set(false);
      },
    });
  }

  private applyFilteredCoupons(items: Coupon[]) {
    const term = this.searchTerm.trim().toLowerCase();
    let filtered = items;

    if (term) {
      filtered = filtered.filter(coupon =>
        (coupon.code || '').toLowerCase().includes(term) ||
        (coupon.name || '').toLowerCase().includes(term) ||
        (coupon.description || '').toLowerCase().includes(term)
      );
    }

    if (this.typeFilter !== 'all') {
      const targetType = this.typeFilter === 'fixed' ? 1 : 0;
      filtered = filtered.filter(coupon => coupon.discountType === targetType);
    }

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(coupon => {
        if (this.statusFilter === 'active') return coupon.active && !this.isExpired(coupon) && !this.isPending(coupon);
        if (this.statusFilter === 'inactive') return !coupon.active;
        return this.isExpired(coupon);
      });
    }

    this.coupons.set(filtered);
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

  private mapItems(items: any[]): Coupon[] {
    return (items || []).map(mapCouponApiItem);
  }

  private isExpired(coupon: Coupon): boolean {
    if (!coupon.endDate) return false;
    const end = new Date(`${coupon.endDate.slice(0, 10)}T23:59:59`);
    return Number.isFinite(end.getTime()) && end < new Date();
  }

  private isPending(coupon: Coupon): boolean {
    if (!coupon.startDate) return false;
    const start = new Date(`${coupon.startDate.slice(0, 10)}T00:00:00`);
    return Number.isFinite(start.getTime()) && start > new Date();
  }

  private formatDate(value: string | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return value.slice(0, 10);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatMoney(value: number): string {
    return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private formatNumber(value: number): string {
    return value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  }
}
