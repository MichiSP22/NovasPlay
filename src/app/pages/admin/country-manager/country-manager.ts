import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CountryService, Country, AssignCoinPayload, mapCountryApiItem } from '../../../entities/country';
import { CoinService, Coin, mapCoinApiItem } from '../../../entities/coin';
import { SearchRequest } from '../../../core/http/http.models';
import { CountryFormModalComponent } from '../../../features/country/country-form-modal/country-form-modal';
import { ResponsiveService } from '../../../core/platform/responsive.service';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-country-manager',
  standalone: true,
  imports: [CommonModule, CountryFormModalComponent],
  templateUrl: './country-manager.html',
  styleUrl: './country-manager.css'
})
export class CountryManagerComponent implements OnInit {
  private countryService = inject(CountryService);
  private coinService = inject(CoinService); 
  private responsiveService = inject(ResponsiveService);
  private notify = inject(NotificationService);
  
  // Señales para el CRUD de Países
  countries = signal<Country[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  selectedCountry = signal<Country | null>(null);

  // Señales para Paginación de Países
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Señales para Asignar Monedas
  showAssignModal = signal<boolean>(false);
  availableCoins = signal<Coin[]>([]);
  selectedCoinIds = signal<number[]>([]);

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      this.loadCountries();
      this.loadAvailableCoins();
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
      if (reload) this.loadCountries();
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadCountries();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadCountries();
    }
  }

  // ---- LÓGICA DEL CRUD DE PAÍSES ----
  loadCountries() {
    this.loading.set(true);
    
    // 1. Armamos el objeto con las propiedades de tu interfaz
    const searchCriteria: Partial<SearchRequest> = {
      pageNumber: this.currentPage(),
      pageSize: this.pageSize(),
      
      // Ordenamiento por defecto (ej: por ID de forma descendente para ver los más nuevos primero)
      orderByField: 'Id', 
      orderByAscending: false, 
      
      
      
      // Optimizamos la consulta pidiendo SOLO las columnas que la tabla necesita
      select: ['Id', 'Name', 'IsoCode', 'ImageURL'] 
    };

    // 2. Le pasamos el objeto completo al servicio
    this.countryService.search(searchCriteria).subscribe({
      next: (res) => { 
        if (res?.success && res.value) {
          
          // Mapeamos de C# (Mayúsculas) a Angular (Minúsculas)
          const paisesMapeados: Country[] = (res.value.items as any[]).map(mapCountryApiItem);

          this.countries.set(paisesMapeados);
          this.totalItems.set(res.value.totalItems);
          this.totalPages.set(res.value.totalPages);
          
        } else {
          this.countries.set([]);
        }
        this.loading.set(false); 
      },
      error: (err) => {
        console.error('Error cargando países:', err);
        this.loading.set(false);
        this.countries.set([]);
      }
    });
  }

  openModal(country: Country | null = null) {
    this.selectedCountry.set(country);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedCountry.set(null);
  }

  onSaveSuccess() {
    this.closeModal();
    this.loadCountries(); // ¡Ya puedes recargar la lista de forma segura!
  }

  deleteCountry(id: number | undefined) {
    if (!id || !confirm('¿Estás seguro de eliminar este país permanentemente?')) return;
    this.countryService.delete(id).subscribe(() => { 
      this.loadCountries(); 
    });
  }

  // ---- LÓGICA PARA CARGAR Y ASIGNAR MONEDAS ----
  loadAvailableCoins() {
    this.coinService.search({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        if (res.success && res.value) {
          const monedasMapeadas: Coin[] = (res.value.items as any[]).map(mapCoinApiItem);
          this.availableCoins.set(monedasMapeadas);
        }
      },
      error: (err) => console.error('Error cargando monedas para los checkboxes:', err)
    });
  }

  openAssignModal(country: Country) {
    this.selectedCountry.set(country);
    // Vaciamos la selección previa
    this.selectedCoinIds.set([]); 
    this.showAssignModal.set(true);
  }

  closeAssignModal() {
    this.showAssignModal.set(false);
    this.selectedCountry.set(null);
    this.selectedCoinIds.set([]);
  }

  isCoinSelected(coinId: number): boolean {
    return this.selectedCoinIds().includes(coinId);
  }

  toggleCoinSelection(coinId: number) {
    const currentList = this.selectedCoinIds();
    if (currentList.includes(coinId)) {
      this.selectedCoinIds.set(currentList.filter(id => id !== coinId));
    } else {
      this.selectedCoinIds.set([...currentList, coinId]);
    }
  }

  saveCoinAssignment() {
    const countryId = this.selectedCountry()?.id;
    if (!countryId) return;

    const payload: AssignCoinPayload[] = [
      {
        id: countryId,
        relatedIDs: this.selectedCoinIds()
      }
    ];

    this.countryService.assignCoins(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.show('success', 'Monedas asignadas correctamente');
          this.closeAssignModal();
        }
      },
      error: (err) => {
        console.error('Error al asignar monedas', err);
        this.notify.show('error', 'Error al asignar monedas. Por favor, intenta de nuevo.');
      }
    });
  }
}