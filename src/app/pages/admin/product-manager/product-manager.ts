import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService, Product, AssignCategoryPayload, mapProductApiItem } from '../../../entities/product';
import { SearchRequest } from '../../../core/http/http.models';
import { CategoryService, Category } from '../../../entities/category';
import { NotificationService } from '../../../shared/ui/toast/notification.service';
import { ProductFormModalComponent } from '../../../features/product/product-form-modal/product-form-modal';
import { ResponsiveService } from '../../../core/platform/responsive.service';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';

@Component({
  selector: 'app-product-manager',
  standalone: true,
  imports: [CommonModule, ProductFormModalComponent, FormsModule],
  templateUrl: './product-manager.html',
  styleUrl: './product-manager.css'
})
export class ProductManagerComponent implements OnInit {
  private productService: ProductService = inject(ProductService);
  private categoryService: CategoryService = inject(CategoryService);
  private notify = inject(NotificationService);
  private responsiveService = inject(ResponsiveService);
  
  // Señales CRUD Productos
  products = signal<Product[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  selectedProduct = signal<Product | null>(null);

  // Paginación
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Señales y estado para el Modal de Confirmación
  showConfirmModal = signal<boolean>(false);
  confirmMessage = signal<string>('');
  private confirmAction: (() => void) | null = null;

  // Señales para Asignar Categorías
  showAssignModal = signal<boolean>(false);
  availableCategories = signal<Category[]>([]);
  selectedCategoryIds = signal<number[]>([]);

  // Expansión de descripciones
  expandedItems = signal<number[]>([]);

  constructor() {}

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      this.loadProducts();
      this.loadAvailableCategories();
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
      if (reload) this.loadProducts();
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
      this.loadProducts();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadProducts();
    }
  }

  loadProducts() {
    this.loading.set(true);
    const searchCriteria: Partial<SearchRequest> = {
      pageNumber: this.currentPage(),
      pageSize: this.pageSize(),
      orderByField: 'Id',
      orderByAscending: false
    };

    this.productService.search(searchCriteria).subscribe({
      next: (res) => { 
        if (res?.success && res.value) {
          console.log('Productos crudos:', res.value.items);
          const mappedProducts: Product[] = (res.value.items as any[]).map(mapProductApiItem);
          this.products.set(mappedProducts);
          this.totalItems.set(res.value.totalItems);
          this.totalPages.set(res.value.totalPages);
        } else {
          this.products.set([]);
        }
        this.loading.set(false); 
      },
      error: () => { this.loading.set(false); this.products.set([]); }
    });
  }

  // --- MÉTODOS DEL MODAL DE PRODUCTO ---
  openModal(product: Product | null = null) {
    this.selectedProduct.set(product);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedProduct.set(null);
  }

  onSaveSuccess() {
    this.closeModal();
    this.loadProducts();
    this.productService.productsChanged.next();
  }

  openConfirm(message: string, action: () => void) {
    this.confirmMessage.set(message);
    this.confirmAction = action;
    this.showConfirmModal.set(true);
  }

  closeConfirm() {
    this.showConfirmModal.set(false);
    this.confirmAction = null;
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

  executeConfirm() {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.closeConfirm();
  }

  deleteProduct(id: number | undefined) {
    if (!id) return;
    this.openConfirm('¿Eliminar este producto permanentemente?', () => {
      this.productService.delete(id).subscribe(() => {
        this.loadProducts();
        this.productService.productsChanged.next();
      });
    });
  }

  // --- LÓGICA DE ASIGNACIÓN DE CATEGORÍAS ---
  loadAvailableCategories() {
    // Le mandamos directamente el 1 (página) y el 100 (cantidad)
    this.categoryService.search(1, 100).subscribe({
      next: (res) => {
        if (res.success && res.value) {
          const categoriasMapeadas: Category[] = (res.value.items as any[]).map(item => ({
            id: item.Id,
            name: item.Name,
            description: item.Description
          }));
          this.availableCategories.set(categoriasMapeadas);
        }
      }
    });
  }

  openAssignModal(product: Product) {
    this.selectedProduct.set(product);
    // Si el producto ya tiene categorías asignadas, las preseleccionamos
    this.selectedCategoryIds.set(product.categoryIds ? [...product.categoryIds] : []); 
    this.showAssignModal.set(true);
  }

  closeAssignModal() {
    this.showAssignModal.set(false);
    this.selectedProduct.set(null);
    this.selectedCategoryIds.set([]);
  }

  isCategorySelected(catId: number): boolean {
    return this.selectedCategoryIds().includes(catId);
  }

  toggleCategorySelection(catId: number) {
    const currentList = this.selectedCategoryIds();
    if (currentList.includes(catId)) {
      this.selectedCategoryIds.set(currentList.filter(id => id !== catId));
    } else {
      this.selectedCategoryIds.set([...currentList, catId]);
    }
  }

  saveCategoryAssignment() {
    const productId = this.selectedProduct()?.id;
    if (!productId) return;

    const payload: AssignCategoryPayload[] = [{
      id: productId,
      relatedIDs: this.selectedCategoryIds()
    }];

    this.productService.assignCategories(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.show('success', 'Categorías asignadas correctamente');
          this.closeAssignModal();
        }
      }
    });
  }
}