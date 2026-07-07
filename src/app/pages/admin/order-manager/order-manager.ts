import { Component, OnInit, inject, signal, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { OrderService, Order, getOrderStatusLabel, getOrderStatusColor, getCurrencySymbol, OrderStatus } from '../../../entities/order';
import { OrderStatusModalComponent } from '../../../features/order/order-status-modal/order-status-modal';
import { SearchRequest } from '../../../core/http/http.models';
import { ResponsiveService } from '../../../core/platform/responsive.service';
import { forkJoin, Observable } from 'rxjs';
import { DataCacheService } from '../../../core/cache/data-cache.service';
import { CyberDatepickerComponent } from '../../../shared/components/cyber-datepicker/cyber-datepicker';
import { User, UserService } from '../../../entities/user';
import { resolveOrderDetailDataValue } from '../../../shared/utils/order-detail-data.util';

@Component({
  selector: 'app-order-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderStatusModalComponent, CyberDatepickerComponent],
  templateUrl: './order-manager.html',
  styleUrl: './order-manager.css'
})
export class OrderManagerComponent implements OnInit {
  private orderService = inject(OrderService);
  private responsiveService = inject(ResponsiveService);
  private dataCache = inject(DataCacheService);
  private userService = inject(UserService);
  
  orders = signal<Order[]>([]);
  loading = signal<boolean>(false);
  
  showProcessModal = signal<boolean>(false);
  @Input() filterUserId: string | null = null;
  @Input() isEmbedded = false;
  @Output() viewClient = new EventEmitter<{firstName: string, lastName: string}>();
  selectedOrder = signal<Order | null>(null);

  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  statusLabel = getOrderStatusLabel;
  statusColor = getOrderStatusColor;
  currencySymbol = getCurrencySymbol;
  OrderStatus = OrderStatus;

  filterStatusVal = '0'; // Por defecto: Pendiente
  filterStartDateVal = '';
  filterEndDateVal = '';
  adminFilterUserId = '';
  adminUsers = signal<User[]>([]);
  currentUserId = signal<string>('');
  currentUserRole = signal<string>('');

  @Input() set externalStartDate(val: string) {
    if (this.filterStartDateVal !== val) {
      this.filterStartDateVal = val;
      if (this.isEmbedded && this.responsiveService.isBrowser) this.loadOrders();
    }
  }

  @Input() set externalEndDate(val: string) {
    if (this.filterEndDateVal !== val) {
      this.filterEndDateVal = val;
      if (this.isEmbedded && this.responsiveService.isBrowser) this.loadOrders();
    }
  }

  ngOnInit() {
    this.updatePageSize(false);
    if (!this.responsiveService.isBrowser) return;

    this.userService.getMe().subscribe({
      next: (res) => {
        if (res?.success && res.value) {
          this.currentUserId.set(res.value.id || '');
          this.currentUserRole.set((res.value.role || '').toLowerCase());
        }

        if (!this.isEmbedded && !this.isSupportView()) {
          this.loadAdminUsersForFilter();
        }
        this.loadOrders();
      },
      error: () => {
        if (!this.isEmbedded) {
          this.loadAdminUsersForFilter();
        }
        this.loadOrders();
      }
    });
  }

  isSupportView(): boolean {
    return this.currentUserRole() === 'support';
  }

  private loadAdminUsersForFilter() {
    this.userService.search({
      pageNumber: 1,
      pageSize: 100,
      filters: [{ field: 'Role', operator: 1, value: 'User' }]
    }).subscribe({
      next: (res) => {
        const items = res?.value?.items || [];
        const mapped: User[] = items.map((item: any) => ({
          id: item.UserID || item.userID || item.Id || item.id || '',
          firstName: item.FirstName || item.firstName || '',
          lastName: item.LastName || item.lastName || '',
          role: item.Role || item.role || ''
        }));
        this.adminUsers.set(mapped.filter(u => (u.role || '').toLowerCase() !== 'user'));
      },
      error: () => this.adminUsers.set([])
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.responsiveService.run(() => this.updatePageSize(true));
  }

  updatePageSize(reload: boolean) {
    const width = this.responsiveService.screenWidth();
    let newSize = 10;
    if (width < 768) newSize = 5;

    if (this.pageSize() !== newSize) {
      this.pageSize.set(newSize);
      this.currentPage.set(1);
      if (reload) this.loadOrders();
    }
  }

  // Expansión de descripciones
  expandedItems = signal<number[]>([]);

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
      this.loadOrders();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadOrders();
    }
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadOrders();
  }

  clearFilters() {
    this.filterStatusVal = '';
    this.filterStartDateVal = '';
    this.filterEndDateVal = '';
    this.adminFilterUserId = '';
    this.currentPage.set(1);
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.dataCache.ensureDataLoaded().subscribe(() => {
      const activeFilters = [];
      if (this.filterStatusVal !== '') {
        activeFilters.push({ field: 'OrderDetails_Status', operator: 0, value: Number(this.filterStatusVal) });
      }
      if (this.adminFilterUserId && !this.isSupportView()) {
        activeFilters.push({ field: 'UserAdminID', operator: 0, value: this.adminFilterUserId });
      }


      if (this.filterStartDateVal || this.filterEndDateVal || this.filterUserId || this.isSupportView()) {
        // El filtro de fecha o de usuario específico causa problemas con el parseo dinámico de UTC en el backend
        // o no está soportado. Se maneja localmente:
        this.fetchAllOrdersAndFilter();
        return;
      }

      const searchCriteria: Partial<SearchRequest> = {
        pageNumber: this.currentPage(),
        pageSize: this.pageSize(),
        orderByField: 'Id',
        orderByAscending: false,
        filters: activeFilters
      };

      this.orderService.search(searchCriteria).subscribe({
        next: (res) => { 
          if (res?.success && res.value) {
            const mapped: Order[] = this.mapOrders(res.value.items || []);
            this.orders.set(mapped);
            this.totalItems.set(res.value.totalItems || mapped.length);
            this.totalPages.set(res.value.totalPages || 1);
          } else {
            this.orders.set([]);
          }
          this.loading.set(false); 
        },
        error: () => { this.loading.set(false); this.orders.set([]); }
      });
    });
  }

  private fetchAllOrdersAndFilter() {
    // Primero una petición para ver cuántas páginas hay (usando el máximo permitido por el backend)
    this.orderService.search({ pageNumber: 1, pageSize: 100, filters: [] }).subscribe({
      next: (firstRes: any) => {
        if (!firstRes?.success || !firstRes.value) {
          this.orders.set([]);
          this.loading.set(false);
          return;
        }

        const items = firstRes.value.items || [];
        const totalPages = firstRes.value.totalPages || 1;

        if (totalPages <= 1) {
          this.applyLocalFilter(this.mapOrders(items));
          return;
        }

        // Traer el resto en paralelo
        const allMapped = this.mapOrders(items);
        const remaining: Observable<any>[] = [];
        for (let p = 2; p <= totalPages; p++) {
          remaining.push(this.orderService.search({ pageNumber: p, pageSize: 100, filters: [] }));
        }

        forkJoin(remaining).subscribe({
          next: (responses) => {
            responses.forEach(res => {
              if (res?.success && res.value) {
                allMapped.push(...this.mapOrders(res.value.items || []));
              }
            });
            this.applyLocalFilter(allMapped);
          },
          error: () => this.applyLocalFilter(allMapped)
        });
      },
      error: () => {
        this.orders.set([]);
        this.loading.set(false);
      }
    });
  }

  private applyLocalFilter(allOrders: Order[]) {
    let filtered = allOrders;

    if (this.isSupportView()) {
      const supportUserId = this.currentUserId();
      filtered = filtered.filter(o =>
        (supportUserId && o.userAdminID === supportUserId) ||
        Number(o.status) === Number(OrderStatus.Pending)
      );
    }

    if (this.filterUserId) {
      filtered = filtered.filter(o => o.userID === this.filterUserId);
    }
    if (this.adminFilterUserId && !this.isSupportView()) {
      filtered = filtered.filter(o => o.userAdminID === this.adminFilterUserId);
    }

    if (this.filterStatusVal !== '') {
      filtered = filtered.filter(o => Number(o.status) === Number(this.filterStatusVal));
    }

    if (this.filterStartDateVal) {
      const start = new Date(`${this.filterStartDateVal}T00:00:00`);
      filtered = filtered.filter(o => o.createdAt && new Date(o.createdAt) >= start);
    }
    
    if (this.filterEndDateVal) {
      const end = new Date(`${this.filterEndDateVal}T23:59:59`);
      filtered = filtered.filter(o => o.createdAt && new Date(o.createdAt) <= end);
    }
    
    this.orders.set(filtered);
    this.totalItems.set(filtered.length);
    this.totalPages.set(1);
    this.currentPage.set(1);
    this.loading.set(false);
  }

  private mapOrders(items: any[]): Order[] {
    return items.map(item => {
      // Intentar obtener la URL de todas las formas posibles (aplanado y colección)
      let rawScreenshotData = item.OrderScreenshots_ImageURL || item.orderScreenshots_ImageURL || 
                               item.FKOrderScreenshots_ImageURL || item.fKOrderScreenshots_ImageURL ||
                               item.fkOrderScreenshots_ImageURL;
      
      let screenshotUrls: string[] = [];

      // Si es un string simple, lo agregamos al array
      if (typeof rawScreenshotData === 'string' && rawScreenshotData.trim() !== '') {
        screenshotUrls.push(rawScreenshotData);
      } else if (Array.isArray(rawScreenshotData) && rawScreenshotData.length > 0) {
        // Si ya es un array de strings (o de objetos, filtramos)
        rawScreenshotData.forEach(s => {
          if (typeof s === 'string') screenshotUrls.push(s);
          else if (s && typeof s === 'object') {
            const url = s.ImageURL || s.imageUrl || s.imageURL || s.ImageUrl;
            if (url) screenshotUrls.push(url);
          }
        });
      }

      // Fallback: ver si viene como colección de objetos en otra propiedad
      if (screenshotUrls.length === 0) {
        const collection = item.OrderScreenshots || item.orderScreenshots || 
                           item.FKOrderScreenshots || item.fkOrderScreenshots ||
                           item.fKOrderScreenshots;
        if (Array.isArray(collection) && collection.length > 0) {
          collection.forEach(shot => {
            const url = shot.ImageURL || shot.imageUrl || shot.imageURL || shot.ImageUrl;
            if (url) screenshotUrls.push(url);
          });
        }
      }

      const idsList = item.OrderDetails_Id || item.orderDetails_Id || [];
      const detailDataValues = item.OrderDetails_OrderDetailData_Value || item.orderDetails_OrderDetailData_Value || item.OrderDetails_Data_Value || item.orderDetails_Data_Value || [];
      const len = Array.isArray(idsList) ? idsList.length : 0;
      const recharges = [];
      for (let i = 0; i < len; i++) {
        const paymentID = (item.OrderDetails_PaymentID || item.orderDetails_PaymentID || item.OrderDetails_PaymentId || item.orderDetails_PaymentId || item.OrderDetails_Payment_Id || item.orderDetails_Payment_Id)?.[i];
        
        recharges.push({
           id: idsList[i],
           accountPay: resolveOrderDetailDataValue(detailDataValues, i),
           reference: (item.OrderDetails_Reference || item.orderDetails_Reference)?.[i],
           paymentDate: (item.OrderDetails_PaymentDate || item.orderDetails_PaymentDate)?.[i],
           name: (item.OrderDetails_Name || item.orderDetails_Name)?.[i],
           price: (item.OrderDetails_Price || item.orderDetails_Price)?.[i],
           status: (item.OrderDetails_Status || item.orderDetails_Status)?.[i],
           paymentID: paymentID,
           payment_Name: this.dataCache.getPaymentName(paymentID),
           payment_Coin_Symbol: this.dataCache.getSymbolByPaymentId(paymentID)
        });
      }
      const firstR = recharges.length > 0 ? recharges[0] : null;
      const rawStatus = firstR ? (firstR.status ?? 0) : 0;
      const parsedStatus = Number(rawStatus);

      return {
        id: item.Id || item.id,
        userID: item.UserID || item.userID,
        userAdminID: item.UserAdminID || item.userAdminID,
        userFirstName: item.User_FirstName || item.user_FirstName,
        userLastName: item.User_LastName || item.user_LastName,
        createdAt: item.CreatedAt || item.createdAt,
        description: item.Description || item.description,
        reference: firstR ? (firstR.reference || 'N/A') : 'N/A',
        total: recharges.reduce((sum: number, r: any) => sum + (r.price || 0), 0),
        status: isNaN(parsedStatus) ? 0 : parsedStatus,
        OrderDetails: recharges,
        // Capturamos la primera imagen de la lista de screenshots si existe
        OrderScreenshots_ImageURL: screenshotUrls
      };
    });
  }


  // Ver capturas de pantalla
  showScreenshotModal = signal<boolean>(false);
  currentScreenshots = signal<string[]>([]);

  viewScreenshot(url: string | string[]) {
    // Convertimos siempre a arreglo
    const urls = Array.isArray(url) ? url : [url];
    const finalUrls: string[] = [];
    
    const baseUrl = environment.apiUrl.endsWith('/') 
      ? environment.apiUrl.slice(0, -1) 
      : environment.apiUrl;

    urls.forEach(u => {
      if (u) {
        let finalUrl = u;
        // Si la URL es relativa, le anteponemos el apiUrl
        if (!finalUrl.startsWith('http')) {
          const relativePath = finalUrl.startsWith('/') ? finalUrl : '/' + finalUrl;
          finalUrl = baseUrl + relativePath;
        }
        finalUrls.push(finalUrl);
      }
    });
    
    if (finalUrls.length > 0) {
      this.currentScreenshots.set(finalUrls);
      this.showScreenshotModal.set(true);
    }
  }

  closeScreenshotModal() {
    this.showScreenshotModal.set(false);
    this.currentScreenshots.set([]);
  }

  openProcessModal(order: Order) {
    this.selectedOrder.set(order);
    this.showProcessModal.set(true);
  }

  closeProcessModal() {
    this.showProcessModal.set(false);
    this.selectedOrder.set(null);
  }

  onOrderProcessed() {
    this.closeProcessModal();
    this.loadOrders(); // Recargamos la tabla para ver el nuevo estado
  }

  scrollLeft(el: HTMLElement) {
    requestAnimationFrame(() => {
      el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' });
    });
  }

  scrollRight(el: HTMLElement) {
    requestAnimationFrame(() => {
      el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
    });
  }

  goToClient(order: Order) {
    this.viewClient.emit({
      firstName: order.userFirstName || '',
      lastName: order.userLastName || ''
    });
  }

  cleanDescription(desc: string | undefined): string {
    if (!desc) return 'Sin descripción';
    const cleaned = desc.replace(/\[ADMIN:[a-f0-9-]+\]\s*/i, '').trim();
    return cleaned || 'Sin descripción';
  }

}
