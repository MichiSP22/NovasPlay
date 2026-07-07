import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoinService, Coin, mapCoinApiItem } from '../../../entities/coin';
import { CoinFormModalComponent } from '../../../features/coin/coin-form-modal/coin-form-modal';
import { ResponsiveService } from '../../../core/platform/responsive.service';

@Component({
  selector: 'app-coin-manager',
  standalone: true,
  imports: [CommonModule, CoinFormModalComponent],
  templateUrl: './coin-manager.html',
  styleUrl: './coin-manager.css'
})
export class CoinManagerComponent implements OnInit {
  private coinService = inject(CoinService);
  private responsiveService = inject(ResponsiveService);
  
  coins = signal<Coin[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  selectedCoin = signal<Coin | null>(null);

  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);

  pageSize = signal<number>(10);
  orderBy = signal<string>('Id');
  ascending = signal<boolean>(true);

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      this.loadCoins();
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
      if (reload) this.loadCoins();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadCoins();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadCoins();
    }
  }

 loadCoins() {
    this.loading.set(true);
    
    // Armamos el objeto con todos los criterios de búsqueda
    const searchCriteria = {
      pageNumber: this.currentPage(),
      pageSize: this.pageSize(),
      orderByField: this.orderBy(),
      orderByAscending: this.ascending()
    };

    this.coinService.search(searchCriteria).subscribe({
      next: (response) => {
        if (response?.success && response.value) {
          
          // Mapeamos de Mayúsculas (C#) a Minúsculas (Angular)
          // Usamos 'any' en item porque C# nos manda { Id, Name, Code, Symbol }
          const monedasMapeadas: Coin[] = (response.value.items as any[]).map(mapCoinApiItem);

          // Actualizamos la tabla y la paginación
          this.coins.set(monedasMapeadas);
          this.totalItems.set(response.value.totalItems);
          this.totalPages.set(response.value.totalPages);

        } else {
          this.coins.set([]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando monedas:', err);
        this.loading.set(false);
        this.coins.set([]);
      }
    });
  }

  openModal(coin: Coin | null = null) {
    this.selectedCoin.set(coin);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedCoin.set(null);
  }

  onSaveSuccess() {
    this.closeModal();
    this.loadCoins();
  }

  deleteCoin(id: number | undefined) {
    if (!id || !confirm('¿Estás seguro de eliminar esta moneda?')) return;
    
    this.coinService.delete(id).subscribe(() => {
      this.loadCoins();
    });
  }
}