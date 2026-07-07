import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PriceService, Price, mapPriceApiItem } from '../../../entities/price';
import { RechargeService, Recharge } from '../../../entities/recharge';
import { PaymentService, Payment } from '../../../entities/payment';
import { ProductService, Product } from '../../../entities/product';
import { PriceFormModalComponent } from '../../../features/price/price-form-modal/price-form-modal';
import { SearchRequest } from '../../../core/http/http.models';
import { ResponsiveService } from '../../../core/platform/responsive.service';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';

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
  private productService = inject(ProductService);
  private responsiveService = inject(ResponsiveService);
  
  prices = signal<Price[]>([]);
  loading = signal<boolean>(false);
  
  // Listas de soporte para los dropdowns y la tabla
  rechargesList = signal<Recharge[]>([]);
  paymentsList = signal<Payment[]>([]);
  productsList = signal<Product[]>([]);

  selectedProductFilter = signal<number>(0);
  selectedPaymentFilter = signal<number>(0);
  searchTerm: string = '';
  searchProductTerm: string = '';
  private filterSubject = new Subject<void>();

  constructor() {
    this.filterSubject.pipe(debounceTime(350)).subscribe(() => {
      this.loadPrices();
    });
  }

  showModal = signal<boolean>(false);
  selectedPrice = signal<Price | null>(null);

  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      this.loadSupportData();
      this.loadPrices();
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

  // Cargamos Monedas y Recargas para pasarlas al modal
  loadSupportData() {
    const params: Partial<SearchRequest> = { pageNumber: 1, pageSize: 100 };
    
    this.rechargeService.search(params).subscribe(res => {
      if (res?.success && res.value) {
        const recs = (res.value.items as any[]).map(item => ({ id: item.Id, name: item.Name, productID: item.ProductID, description: '', soldOut: false }));
        this.rechargesList.set(recs);
      }
    });

    this.paymentService.search(1, 100).subscribe(res => {
      if (res?.success && res.value) {
        const payments = (res.value.items as any[]).map(item => ({ 
          id: item.Id, 
          coinID: item.CoinID,
          name: item.Name, 
          description: item.Description,
          international: item.International
        }));
        this.paymentsList.set(payments);
      }
    });

    this.productService.search({ pageNumber: 1, pageSize: 100 }).subscribe(res => {
      if (res?.success && res.value) {
        const prods = (res.value.items as any[]).map(item => ({ id: item.Id, name: item.Name, description: item.Description, timeMinRecharge: item.TimeMinDetail, timeMaxRecharge: item.TimeMaxDetail, soldOut: item.SoldOut }));
        this.productsList.set(prods);
      }
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
        this.prices.set([]);
        this.totalItems.set(0);
        this.totalPages.set(1);
        this.loading.set(false);
        return;
      }

      searchCriteria.filters!.push({
        field: 'DetailID',
        operator: 9, // In
        value: detailIdsByProduct
      });
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      const detailIdsByRechargeName = currentRecharges
        .filter(r => (r.name || '').toLowerCase().includes(term))
        .map(r => r.id!)
        .filter(Boolean);

      if (detailIdsByRechargeName.length === 0) {
        this.prices.set([]);
        this.totalItems.set(0);
        this.totalPages.set(1);
        this.loading.set(false);
        return;
      }

      searchCriteria.filters!.push({
        field: 'DetailID',
        operator: 9, // In
        value: detailIdsByRechargeName
      });
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
        this.prices.set([]);
        this.totalItems.set(0);
        this.totalPages.set(1);
        this.loading.set(false);
        return;
      }

      searchCriteria.filters!.push({
        field: 'DetailID',
        operator: 9, // In
        value: detailIdsByProductName
      });
    }

    // Filtro por Método de Pago
    if (this.selectedPaymentFilter() > 0) {
      searchCriteria.filters!.push({
        field: 'PaymentID',
        operator: 0, // Equal
        value: this.selectedPaymentFilter()
      });
    }

    this.priceService.search(searchCriteria).subscribe({
      next: (res) => { 
        console.log("Respuesta del search de precios:", res);
        if (res?.success && res.value) {
          const rechargeById = new Map(this.rechargesList().map(r => [r.id, r]));
          const productById = new Map(this.productsList().map(p => [p.id, p]));
          const paymentById = new Map(this.paymentsList().map(p => [p.id, p]));

          const mapped: Price[] = (res.value.items as any[]).map(item => {
            const p = mapPriceApiItem(item);
            const recharge = rechargeById.get(p.detailID);
            const product = productById.get(recharge?.productID || 0);
            const payment = paymentById.get(p.paymentID);

            return {
              ...p,
              productName: p.productName || product?.name || '',
              coinSymbol: p.coinSymbol || (payment as any)?.symbol || (payment as any)?.coinSymbol || '$'
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
        console.error("Error cargando precios:", err);
        this.loading.set(false); 
        this.prices.set([]); 
      }
    });
  }

  // Helpers para la tabla
  getRechargeName(id: number): string {
    return this.rechargesList().find(r => r.id === id)?.name || `Recarga #${id}`;
  }

  getPaymentName(id: number): string {
    return this.paymentsList().find(p => p.id === id)?.name || '';
  }

  openModal(price: Price | null = null) {
    this.selectedPrice.set(price);
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
    if (!id || !confirm('¿Estás seguro de eliminar este precio?')) return;
    this.priceService.delete(id).subscribe(() => this.loadPrices());
  }

  onProductFilterChange(event: any) {
    this.selectedProductFilter.set(Number(event.target.value));
    this.currentPage.set(1);
    this.filterSubject.next();
  }

  onPaymentFilterChange(event: any) {
    this.selectedPaymentFilter.set(Number(event.target.value));
    this.currentPage.set(1);
    this.filterSubject.next();
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.filterSubject.next();
  }
}

