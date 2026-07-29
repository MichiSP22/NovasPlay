import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { Coin, CoinService, mapCoinApiItem } from '../../../entities/coin';
import { Conversion, ConversionService, mapConversionApiItem } from '../../../entities/conversion';
import { SearchRequest } from '../../../core/http/http.models';
import { ResponsiveService } from '../../../core/platform/responsive.service';
import { NotificationService } from '../../../shared/ui/toast/notification.service';
import { ConversionFormModalComponent } from '../../../features/conversion/conversion-form-modal/conversion-form-modal';

@Component({
  selector: 'app-conversion-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ConversionFormModalComponent],
  templateUrl: './conversion-manager.html',
  styleUrl: './conversion-manager.css',
})
export class ConversionManagerComponent implements OnInit {
  private conversionService = inject(ConversionService);
  private coinService = inject(CoinService);
  private responsiveService = inject(ResponsiveService);
  private notify = inject(NotificationService);

  conversions = signal<Conversion[]>([]);
  coins = signal<Coin[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  selectedConversion = signal<Conversion | null>(null);
  conversionToDelete = signal<Conversion | null>(null);
  deleting = signal<boolean>(false);

  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  searchTerm = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  private filterSubject = new Subject<void>();

  constructor() {
    this.filterSubject.pipe(debounceTime(280)).subscribe(() => {
      this.currentPage.set(1);
      this.loadConversions();
    });
  }

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      this.loadCoins();
      this.loadConversions();
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
      if (reload) this.loadConversions();
    }
  }

  loadCoins() {
    this.coinService.search({ pageNumber: 1, pageSize: 100, orderByField: 'Code', orderByAscending: true }).subscribe({
      next: (res) => {
        if (res?.success && res.value) {
          this.coins.set((res.value.items as any[]).map(mapCoinApiItem));
        }
      },
    });
  }

  loadConversions() {
    this.loading.set(true);
    const request = this.buildSearch(this.currentPage(), this.pageSize());

    this.conversionService.search(request).subscribe({
      next: (res) => {
        if (res?.success && res.value) {
          const mapped = (res.value.items as any[]).map(item => this.enrichConversion(mapConversionApiItem(item)));
          this.conversions.set(mapped);
          this.totalItems.set(res.value.totalItems || mapped.length);
          this.totalPages.set(res.value.totalPages || 1);
        } else {
          this.conversions.set([]);
          this.totalItems.set(0);
          this.totalPages.set(1);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.conversions.set([]);
        this.notify.show('error', this.extractErrorMessage(err?.error));
      },
    });
  }

  onFilterChange() {
    this.filterSubject.next();
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.currentPage.set(1);
    this.loadConversions();
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.loadConversions();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadConversions();
    }
  }

  openModal(conversion: Conversion | null = null) {
    this.selectedConversion.set(conversion);
    this.showModal.set(true);
  }

  closeModal() {
    this.selectedConversion.set(null);
    this.showModal.set(false);
  }

  onSaveSuccess() {
    this.closeModal();
    this.loadConversions();
  }

  requestDelete(conversion: Conversion) {
    if (!conversion.id) return;
    this.conversionToDelete.set(conversion);
  }

  closeDeleteModal() {
    if (this.deleting()) return;
    this.conversionToDelete.set(null);
  }

  confirmDelete() {
    const conversion = this.conversionToDelete();
    if (!conversion?.id || this.deleting()) return;

    this.deleting.set(true);
    this.conversionService.delete(conversion.id).subscribe({
      next: (res) => {
        this.deleting.set(false);
        if (res?.success) {
          this.conversionToDelete.set(null);
          this.notify.show('success', 'Conversion desactivada correctamente.');
          this.loadConversions();
          return;
        }
        this.notify.show('error', this.extractErrorMessage(res));
      },
      error: (err) => {
        this.deleting.set(false);
        this.notify.show('error', this.extractErrorMessage(err?.error));
      },
    });
  }

  coinLabel(coinID: number, code?: string, symbol?: string): string {
    const coin = this.coins().find(item => item.id === coinID);
    const finalCode = code || coin?.code || `#${coinID}`;
    const finalSymbol = symbol || coin?.symbol || '';
    return finalSymbol ? `${finalCode} (${finalSymbol})` : finalCode;
  }

  pairLabel(conversion: Conversion): string {
    return `${this.coinLabel(conversion.fromCoinID, conversion.fromCoinCode, conversion.fromCoinSymbol)} -> ${this.coinLabel(conversion.toCoinID, conversion.toCoinCode, conversion.toCoinSymbol)}`;
  }

  private buildSearch(pageNumber: number, pageSize: number): SearchRequest {
    const filters: SearchRequest['filters'] = [];
    const term = this.searchTerm.trim().toLowerCase();

    if (this.statusFilter !== 'all') {
      filters.push({ field: 'IsActive', operator: 0, value: this.statusFilter === 'active' });
    }

    if (term) {
      const matchingCoinIds = this.coins()
        .filter(coin => `${coin.name} ${coin.code} ${coin.symbol}`.toLowerCase().includes(term))
        .map(coin => coin.id!)
        .filter(Boolean);

      if (matchingCoinIds.length > 0) {
        filters.push({ field: 'FromCoinID', operator: 9, value: matchingCoinIds });
      }
    }

    return {
      pageNumber,
      pageSize,
      orderByField: 'ID',
      orderByAscending: false,
      filters,
    };
  }

  private enrichConversion(conversion: Conversion): Conversion {
    const fromCoin = this.coins().find(coin => coin.id === conversion.fromCoinID);
    const toCoin = this.coins().find(coin => coin.id === conversion.toCoinID);
    return {
      ...conversion,
      fromCoinCode: conversion.fromCoinCode || fromCoin?.code,
      fromCoinSymbol: conversion.fromCoinSymbol || fromCoin?.symbol,
      toCoinCode: conversion.toCoinCode || toCoin?.code,
      toCoinSymbol: conversion.toCoinSymbol || toCoin?.symbol,
    };
  }

  private extractErrorMessage(payload: any): string {
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return payload.errors.filter(Boolean).join(' | ');
    }
    if (typeof payload?.response === 'string' && payload.response.trim()) return payload.response.trim();
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
    return 'No se pudo completar la operacion.';
  }
}

