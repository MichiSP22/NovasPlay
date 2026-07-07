import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { RechargeService, Recharge, mapRechargeApiItem } from '../../../entities/recharge';
import { ProductService, Product, mapProductApiItem } from '../../../entities/product';
import { RechargeFormModalComponent } from '../../../features/recharge/recharge-form-modal/recharge-form-modal';
// Importamos tu interfaz para la búsqueda
import { SearchRequest } from '../../../core/http/http.models';
import { ResponsiveService } from '../../../core/platform/responsive.service';

@Component({
  selector: 'app-recharge-manager',
  standalone: true,
  imports: [CommonModule, RechargeFormModalComponent, FormsModule],
  templateUrl: './recharge-manager.html',
  styleUrl: './recharge-manager.css'
})
export class RechargeManagerComponent implements OnInit {
  private rechargeService = inject(RechargeService);
  private productService = inject(ProductService);
  private responsiveService = inject(ResponsiveService);
  
  // Señales de Recargas
  recharges = signal<Recharge[]>([]);
  loading = signal<boolean>(false);
  
  // Señal para almacenar los productos disponibles
  productsList = signal<Product[]>([]);

  // Modal
  showModal = signal<boolean>(false);
  selectedRecharge = signal<Recharge | null>(null);

  // Paginación
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Expansión de descripciones
  expandedItems = signal<number[]>([]);

  constructor() {}

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      this.loadProducts(); // Cargamos productos primero para el dropdown
      this.loadRecharges();
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
      if (reload) this.loadRecharges();
    }
  }

  toggleExpand(id: number | undefined) {
    if (!id) return;
    const current = this.expandedItems();
    if (current.includes(id)) {
      this.expandedItems.set(current.filter(i => i !== id));
    } else {
      this.expandedItems.set([...current, id]);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedItems().includes(id);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadRecharges();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadRecharges();
    }
  }

  loadProducts() {
    const params: Partial<SearchRequest> = { pageNumber: 1, pageSize: 100 };
    this.productService.search(params).subscribe({
      next: (res) => {
        if (res?.success && res.value) {
          const mappedProducts: Product[] = (res.value.items as any[]).map(mapProductApiItem);
          this.productsList.set(mappedProducts);
        }
      }
    });
  }

  loadRecharges() {
    this.loading.set(true);
    
    // Usamos tu interfaz impecable
    const searchCriteria: Partial<SearchRequest> = {
      pageNumber: this.currentPage(),
      pageSize: this.pageSize(),
      orderByField: 'Id',
      orderByAscending: false
    };

    this.rechargeService.search(searchCriteria).subscribe({
      next: (res) => { 
        if (res?.success && res.value) {
          const mapped: Recharge[] = (res.value.items as any[]).map(mapRechargeApiItem);
          this.recharges.set(mapped);
          this.totalItems.set(res.value.totalItems);
          this.totalPages.set(res.value.totalPages);
        } else {
          this.recharges.set([]);
        }
        this.loading.set(false); 
      },
      error: () => { this.loading.set(false); this.recharges.set([]); }
    });
  }

  // Helper para mostrar el nombre del producto en la tabla en vez del ID
  getProductName(productID: number): string {
    const product = this.productsList().find(p => p.id === productID);
    return product ? product.name : `Producto #${productID}`;
  }

  openModal(recharge: Recharge | null = null) {
    this.selectedRecharge.set(recharge);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedRecharge.set(null);
  }

  onSaveSuccess() {
    this.closeModal();
    this.loadRecharges();
  }

  deleteRecharge(id: number | undefined) {
    if (!id || !confirm('¿Estás seguro de eliminar esta recarga?')) return;
    this.rechargeService.delete(id).subscribe(() => this.loadRecharges());
  }
}