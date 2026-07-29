import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, forkJoin } from 'rxjs';
import { PriceService, Price, mapPriceApiItem } from '../../../entities/price';
import { RechargeService, Recharge } from '../../../entities/recharge';
import { PaymentService, Payment } from '../../../entities/payment';
import { Coin, CoinService, mapCoinApiItem } from '../../../entities/coin';
import { Conversion, ConversionService, mapConversionApiItem, rateBetween } from '../../../entities/conversion';
import { ProductService, Product } from '../../../entities/product';
import { PriceFormModalComponent } from '../../../features/price/price-form-modal/price-form-modal';
import { SearchRequest } from '../../../core/http/http.models';
import { ResponsiveService } from '../../../core/platform/responsive.service';

@Component({
  selector: 'app-price-manager',
  standalone: true,
  imports: [CommonModule, PriceFormModalComponent, FormsModule],
  templateUrl: './price-manager.html',
  styleUrl: './price-manager.css'
})
export class PriceManagerComponent implements OnInit {
  private priceService = inject(PriceService);
  private rechargeService = inject(RechargeService);
  private paymentService = inject(PaymentService);
  private coinService = inject(CoinService);
  private conversionService = inject(ConversionService);
  private productService = inject(ProductService);
  private responsiveService = inject(ResponsiveService);

  prices = signal<Price[]>([]);
  loading = signal<boolean>(false);

  rechargesList = signal<Recharge[]>([]);
  paymentsList = signal<Payment[]>([]);
  productsList = signal<Product[]>([]);
  coinsList = signal<Coin[]>([]);
  conversionsList = signal<Conversion[]>([]);

  selectedProductFilter = signal<number>(0);
  selectedPaymentFilter = signal<number>(0);
  searchTerm = '';
  searchProductTerm = '';
  private filterSubject = new Subject<void>();

  showModal = signal<boolean>(false);
  selectedPrice = signal<Price | null>(null);

  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  constructor() {
    this.filterSubject.pipe(debounceTime(350)).subscribe(() => {
      this.loadPrices();
    });
  }

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      this.loadSupportData();
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
      if (reload) this.loadPrices();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadPrices();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadPrices();
    }
  }

  loadSupportData() {
    const params: Partial<SearchRequest> = { pageNumber: 1, pageSize: 100 };

    forkJoin({
      recharges: this.rechargeService.search(params),
      payments: this.paymentService.search(1, 100),
      coins: this.coinService.search({ pageNumber: 1, pageSize: 100, orderByField: 'Code', orderByAscending: true }),
      conversions: this.conversionService.search({ pageNumber: 1, pageSize: 100, orderByField: 'ID', orderByAscending: false }),
      products: this.productService.search({ pageNumber: 1, pageSize: 100 }),
    }).subscribe({
      next: ({ recharges, payments, coins, conversions, products }) => {
        if (recharges?.success && recharges.value) {
          this.rechargesList.set((recharges.value.items as any[]).map(item => ({
            id: item.Id,
            name: item.Name,
            productID: item.ProductID,
            description: '',
            soldOut: false,
          })));
        }

        if (payments?.success && payments.value) {
          this.paymentsList.set((payments.value.items as any[]).map(item => ({
            id: item.Id,
            coinID: item.CoinID,
            name: item.Name,
            description: item.Description,
            international: item.International,
          })));
        }

        if (coins?.success && coins.value) {
          this.coinsList.set((coins.value.items as any[]).map(mapCoinApiItem));
        }

        if (conversions?.success && conversions.value) {
          this.conversionsList.set((conversions.value.items as any[]).map(mapConversionApiItem));
        }

        if (products?.success && products.value) {
          this.productsList.set((products.value.items as any[]).map(item => ({
            id: item.Id,
            name: item.Name,
            description: item.Description,
            timeMinRecharge: item.TimeMinDetail,
            timeMaxRecharge: item.TimeMaxDetail,
            soldOut: item.SoldOut,
          })));
        }

        this.loadPrices();
      },
      error: () => this.loadPrices(),
    });
  }

  loadPrices() {
    this.loading.set(true);

    const searchCriteria: Partial<SearchRequest> = {
      pageNumber: this.currentPage(),
      pageSize: this.pageSize(),
      filters: []
    };

    const currentRecharges = this.rechargesList();

    if (this.selectedProductFilter() > 0) {
      const detailIdsByProduct = currentRecharges
        .filter(r => r.productID === this.selectedProductFilter())
        .map(r => r.id!)
        .filter(Boolean);

      if (detailIdsByProduct.length === 0) {
        this.setEmptyPrices();
        return;
      }

      searchCriteria.filters!.push({ field: 'DetailID', operator: 9, value: detailIdsByProduct });
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      const detailIdsByRechargeName = currentRecharges
        .filter(r => (r.name || '').toLowerCase().includes(term))
        .map(r => r.id!)
        .filter(Boolean);

      if (detailIdsByRechargeName.length === 0) {
        this.setEmptyPrices();
        return;
      }

      searchCriteria.filters!.push({ field: 'DetailID', operator: 9, value: detailIdsByRechargeName });
    }

    if (this.searchProductTerm.trim()) {
      const term = this.searchProductTerm.trim().toLowerCase();
      const productIds = this.productsList()
        .filter(p => (p.name || '').toLowerCase().includes(term))
        .map(p => p.id!)
        .filter(Boolean);

      const detailIdsByProductName = currentRecharges
        .filter(r => productIds.includes(r.productID || 0))
        .map(r => r.id!)
        .filter(Boolean);

      if (detailIdsByProductName.length === 0) {
        this.setEmptyPrices();
        return;
      }

      searchCriteria.filters!.push({ field: 'DetailID', operator: 9, value: detailIdsByProductName });
    }

    if (this.selectedPaymentFilter() > 0) {
      searchCriteria.filters!.push({ field: 'PaymentID', operator: 0, value: this.selectedPaymentFilter() });
    }

    this.priceService.search(searchCriteria).subscribe({
      next: (res) => {
        if (res?.success && res.value) {
          const rechargeById = new Map(this.rechargesList().map(r => [r.id, r]));
          const productById = new Map(this.productsList().map(p => [p.id, p]));
          const paymentById = new Map(this.paymentsList().map(p => [p.id, p]));
          const coinById = new Map(this.coinsList().map(c => [c.id, c]));

          const mapped: Price[] = (res.value.items as any[]).map(item => {
            const price = mapPriceApiItem(item);
            const recharge = rechargeById.get(price.detailID);
            const product = productById.get(recharge?.productID || 0);
            const payment = paymentById.get(price.paymentID);

            return {
              ...this.enrichPriceForConversion(price, payment, coinById),
              productName: price.productName || product?.name || '',
              coinSymbol: price.coinSymbol || this.coinSymbolForPayment(payment) || '$'
            };
          });

          this.prices.set(mapped);
          this.totalItems.set(res.value.totalItems);
          this.totalPages.set(res.value.totalPages);
        } else {
          this.prices.set([]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando precios:', err);
        this.loading.set(false);
        this.prices.set([]);
      }
    });
  }

  getRechargeName(id: number): string {
    return this.rechargesList().find(r => r.id === id)?.name || `Recarga #${id}`;
  }

  getPaymentName(id: number): string {
    return this.paymentsList().find(p => p.id === id)?.name || '';
  }

  getReferenceCurrencyLabel(price: Price): string {
    if (!price.referenceCurrencyID) return 'Directo';
    const coin = this.coinsList().find(c => c.id === price.referenceCurrencyID);
    return coin ? `${coin.code} (${coin.symbol})` : price.referenceCurrencySymbol || `Moneda #${price.referenceCurrencyID}`;
  }

  openModal(price: Price | null = null) {
    this.selectedPrice.set(price ? { ...price, price: price.price, promotionPrice: price.promotionPrice } : null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedPrice.set(null);
  }

  onSaveSuccess() {
    this.closeModal();
    this.loadPrices();
  }

  deletePrice(id: number | undefined) {
    if (!id || !confirm('Estas seguro de eliminar este precio?')) return;
    this.priceService.delete(id).subscribe(() => this.loadPrices());
  }

  onProductFilterChange(event: Event) {
    this.selectedProductFilter.set(Number((event.target as HTMLSelectElement).value));
    this.currentPage.set(1);
    this.filterSubject.next();
  }

  onPaymentFilterChange(event: Event) {
    this.selectedPaymentFilter.set(Number((event.target as HTMLSelectElement).value));
    this.currentPage.set(1);
    this.filterSubject.next();
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.filterSubject.next();
  }

  private setEmptyPrices() {
    this.prices.set([]);
    this.totalItems.set(0);
    this.totalPages.set(1);
    this.loading.set(false);
  }

  private coinSymbolForPayment(payment: Payment | undefined): string {
    if (!payment) return '';
    return this.coinsList().find(c => c.id === payment.coinID)?.symbol || '';
  }

  private enrichPriceForConversion(price: Price, payment: Payment | undefined, coinById: Map<number | undefined, Coin>): Price {
    const displayPrice = price.price;
    const displayPromotionPrice = price.promotionPrice;
    const referenceCurrencyID = price.referenceCurrencyID || null;
    const paymentCoinID = payment?.coinID || 0;
    const referenceCoin = coinById.get(referenceCurrencyID || undefined);
    const rate = referenceCurrencyID && paymentCoinID
      ? rateBetween(this.conversionsList(), referenceCurrencyID, paymentCoinID)
      : null;

    if (referenceCurrencyID && rate && rate > 0 && referenceCurrencyID !== paymentCoinID) {
      return {
        ...price,
        referenceCurrencyID,
        referenceCurrencySymbol: price.referenceCurrencySymbol || referenceCoin?.symbol || '',
        displayPrice,
        displayPromotionPrice,
        price: Number((displayPrice / rate).toFixed(2)),
        promotionPrice: Number((displayPromotionPrice / rate).toFixed(2)),
      };
    }

    return {
      ...price,
      referenceCurrencyID,
      referenceCurrencySymbol: price.referenceCurrencySymbol || referenceCoin?.symbol || '',
      displayPrice,
      displayPromotionPrice,
    };
  }
}
