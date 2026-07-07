import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryService, Category, mapCategoryApiItem } from '../../../entities/category';
import { CategoryFormModalComponent } from '../../../features/category/category-form-modal/category-form-modal';
import { ResponsiveService } from '../../../core/platform/responsive.service';

@Component({
  selector: 'app-category-manager',
  standalone: true,
  imports: [CommonModule, CategoryFormModalComponent],
  templateUrl: './category-manager.html',
  styleUrl: './category-manager.css'
})
export class CategoryManagerComponent implements OnInit {
  private categoryService: CategoryService = inject(CategoryService); // <-- Tipado explícito por si acaso
  private responsiveService = inject(ResponsiveService);
  
  categories = signal<Category[]>([]);
  loading = signal<boolean>(false);

  // SEÑALES PARA EL MODAL
  showModal = signal<boolean>(false);
  selectedCategory = signal<Category | null>(null);

  // SEÑALES PARA LA PAGINACIÓN
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Expansión de descripciones
  expandedItems = signal<number[]>([]);

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      this.loadCategories();
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
      if (reload) this.loadCategories();
    }
  }

  toggleExpand(id: number) {
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
      this.loadCategories();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadCategories();
    }
  }

  loadCategories() {
    this.loading.set(true);
    this.categoryService.search(this.currentPage(), this.pageSize()).subscribe({
      next: (response) => {
        if (response?.success && response.value) {
          
          // Mapeamos de C# (Mayúsculas) a Angular (Minúsculas)
          const categoriasMapeadas: Category[] = (response.value.items as any[]).map(mapCategoryApiItem);

          this.categories.set(categoriasMapeadas);
          this.totalItems.set(response.value.totalItems);
          this.totalPages.set(response.value.totalPages);

        } else {
          this.categories.set([]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando categorías:', err);
        this.loading.set(false);
        this.categories.set([]);
      }
    });
  }

  openModal(category: Category | null = null) {
    this.selectedCategory.set(category);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedCategory.set(null);
  }

  onSaveSuccess() {
    this.closeModal();
    this.loadCategories();
  }

  deleteCategory(id: number | undefined) {
    if (!id || !confirm('¿Estás seguro de eliminar esta categoría?')) return;
    
    this.categoryService.delete(id).subscribe(() => {
      this.loadCategories();
    });
  }
}