import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService, User, UpdateProfilePayload } from '../../entities/user';
import { OrderService, Order, getOrderStatusLabel, getOrderStatusClass, getCurrencySymbol } from '../../entities/order';
import { NotificationService } from '../../shared/ui/toast/notification.service';
import { NoCachePipe } from '../../shared/pipes/no-cache.pipe';
import { ResponsiveService } from '../../core/platform/responsive.service';
import { environment } from '../../../environments/environment';
import { CyberDatepickerComponent } from '../../shared/components/cyber-datepicker/cyber-datepicker';
import { DataCacheService } from '../../core/cache/data-cache.service';
import { resolveOrderDetailDataValue } from '../../shared/utils/order-detail-data.util';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NoCachePipe, CyberDatepickerComponent],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css'
})
export class UserProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private notify = inject(NotificationService);
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  private responsiveService = inject(ResponsiveService);
  private dataCache = inject(DataCacheService);

  profileForm: FormGroup;
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  currentUser = signal<User | null>(null);
  userOrders = signal<Order[]>([]);
  loadingOrders = signal<boolean>(true);
  ordersPage = signal<number>(1);
  ordersPageSize = signal<number>(5);
  ordersTotalItems = signal<number>(0);
  ordersTotalPages = signal<number>(1);
  private ordersUserId: string | undefined = undefined;

  statusLabel = getOrderStatusLabel;
  statusClass = getOrderStatusClass;
  currencySymbol = getCurrencySymbol;
  
  activeTab = signal<'datos' | 'ordenes'>('datos');
  hasImageError = signal<boolean>(false);

  selectedImageFile: File | null = null;
  imagePreviewUrl: string | SafeUrl | null = null;

  constructor() {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^\+\d+\s\d+$/)]],
      birth: [''],
      observation: ['']
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'ordenes') {
        this.activeTab.set('ordenes');
      } else {
        this.activeTab.set('datos');
      }
    });
    
    if (this.responsiveService.isBrowser) {
      this.loadProfile();
    }
  }

  setTab(tab: 'datos' | 'ordenes') {
    this.activeTab.set(tab);
  }

  loadProfile() {
    this.loading.set(true);
    this.userService.getMe().subscribe({
      next: (res) => {
        if (res.success && res.value) {
          this.currentUser.set(res.value);
          this.profileForm.patchValue({
            firstName: res.value.firstName || '',
            lastName: res.value.lastName || '',
            phone: res.value.phone || '',
            birth: res.value.birth ? res.value.birth.split('T')[0] : '',
            observation: res.value.observation || ''
          });
          
          const imageObj = res.value.imageInfo as any;
          const url = imageObj?.imageUrl || imageObj?.imageURL || imageObj?.ImageUrl || imageObj?.ImageURL;

          if (url) {
            this.hasImageError.set(false);
            if (url.startsWith('http')) {
              this.imagePreviewUrl = url.replace(/(https?:\/\/[^\/]+)\/\/+/, '$1/');
            } else {
              const cleanUrl = url.replace(/^[\/\\]/, '').replace(/\\/g, '/');
              this.imagePreviewUrl = `${environment.apiUrl}/${cleanUrl}`;
            }
          } else {
            this.imagePreviewUrl = null;
          }
          
          const rawV = res.value as any;
          const role = String(rawV.role || rawV.Role || '').toLowerCase();
          const isAdmin = role === 'administrator' || role === 'root';

          if (isAdmin) {
             const tokenExtractedId = this.extractUserIdFromToken();
             if (tokenExtractedId) {
               this.loadOrders(tokenExtractedId);
             } else {
               this.searchAndLoadOrdersAsAdmin(res.value);
             }
          } else {
             this.loadOrders(undefined);
          }
        } else {
          this.notify.show('error', 'No se pudo cargar tu perfil');
        }
        this.loading.set(false);
      },
      error: () => {
        this.notify.show('error', 'Error al conectarse con el servidor');
        this.loading.set(false);
      }
    });
  }

  private searchAndLoadOrdersAsAdmin(profile: any) {
    const filters = [];
    const email = profile.email || profile.Email || profile.loginInfo?.email || profile.LoginInfo?.Email || profile.loginInfo_Email;
    
    if (email) {
      filters.push({ field: 'LoginInfo.Email', operator: 0, value: email });
    } else {
      if (profile.firstName) filters.push({ field: 'FirstName', operator: 0, value: profile.firstName });
      if (profile.lastName) filters.push({ field: 'LastName', operator: 0, value: profile.lastName });
      if (filters.length === 0 && profile.phone) filters.push({ field: 'Phone', operator: 0, value: profile.phone });
    }

    if (filters.length > 0) {
      this.loadingOrders.set(true);
      this.userService.search({ pageNumber: 1, pageSize: 5, filters }).subscribe({
         next: (searchRes: any) => {
           if (searchRes?.success && searchRes.value?.items?.length > 0) {
             const u = searchRes.value.items[0];
             const myId = String(u.UserID || u.userID || u.Id || u.id || u.userId || '');
             this.loadOrders(myId);
           } else {
             this.loadOrders('');
           }
         },
         error: () => this.loadOrders('')
      });
    } else {
      this.loadOrders('');
    }
  }

  private loadOrders(userId?: string, page = 1) {
    this.ordersUserId = userId;
    this.ordersPage.set(page);
    this.loadingOrders.set(true);
    this.dataCache.ensureDataLoaded().subscribe(() => {
      const reqFilters = [];
      if (userId) {
         reqFilters.push({ field: 'UserID', operator: 0, value: userId });
      }

      this.orderService.search({
        pageNumber: page,
        pageSize: this.ordersPageSize(),
        orderByField: 'CreatedAt',
        orderByAscending: false,
        filters: reqFilters
      }).subscribe({
      next: (res) => {
        if (res && res.success && res.value?.items) {
          let filteredItems = res.value.items;
          if (userId) {
             const userStr = userId.toLowerCase();
             filteredItems = res.value.items.filter((o: any) => 
                String(o.UserID || o.userID || o.userId).toLowerCase() === userStr
             );
          }
            const mappedOrders = filteredItems.map((o: any) => {
              const idsList = o.OrderDetails_Id || o.orderDetails_Id || [];
            const detailDataValues = o.OrderDetails_OrderDetailData_Value || o.orderDetails_OrderDetailData_Value || o.OrderDetails_Data_Value || o.orderDetails_Data_Value || [];
            const len = Array.isArray(idsList) ? idsList.length : 0;
            const recharges = [];
            for (let i = 0; i < len; i++) {
              const paymentID = (o.OrderDetails_PaymentID || o.orderDetails_PaymentID || o.OrderDetails_PaymentId || o.orderDetails_PaymentId || o.OrderDetails_Payment_Id || o.orderDetails_Payment_Id)?.[i];
              recharges.push({
                 id: idsList[i],
                 accountPay: resolveOrderDetailDataValue(detailDataValues, i),
                 reference: (o.OrderDetails_Reference || o.orderDetails_Reference)?.[i],
                 paymentDate: (o.OrderDetails_PaymentDate || o.orderDetails_PaymentDate)?.[i],
                 name: (o.OrderDetails_Name || o.orderDetails_Name)?.[i],
                 price: (o.OrderDetails_Price || o.orderDetails_Price)?.[i],
                 status: (o.OrderDetails_Status || o.orderDetails_Status)?.[i],
                 paymentID: paymentID,
                 payment_Name: this.dataCache.getPaymentName(paymentID),
                 symbol: this.dataCache.getSymbolByPaymentId(paymentID)
              });
            }
            const firstR = recharges.length > 0 ? recharges[0] : null;
            const parsedStatus = Number(firstR ? (firstR.status ?? 0) : 0);
            const currencyTotals = this.buildCurrencyTotals(recharges);
            return {
              id: o.Id || o.id,
              userID: o.UserID || o.userID || o.userId,
              createdAt: o.CreatedAt || o.createdAt,
              reference: firstR ? (firstR.reference || 'N/A') : 'N/A',
              total: currencyTotals.reduce((sum: number, item: any) => sum + item.amount, 0),
              currencyTotals,
              status: isNaN(parsedStatus) ? 0 : parsedStatus,
              description: o.Description || o.description || '',
              OrderDetails: recharges
            };
          });
          this.userOrders.set(mappedOrders);
          this.ordersTotalItems.set(res.value.totalItems || mappedOrders.length);
          this.ordersTotalPages.set(Math.max(1, res.value.totalPages || Math.ceil((res.value.totalItems || mappedOrders.length) / this.ordersPageSize())));
        } else {
          this.userOrders.set([]);
          this.ordersTotalItems.set(0);
          this.ordersTotalPages.set(1);
        }
        this.loadingOrders.set(false);
      },
      error: (err) => {
        console.error('Error cargando órdenes:', err);
        this.userOrders.set([]);
        this.ordersTotalItems.set(0);
        this.ordersTotalPages.set(1);
        this.loadingOrders.set(false);
      }
    });
    });
  }

  private buildCurrencyTotals(items: any[]): { symbol: string; amount: number }[] {
    const totals = new Map<string, number>();

    items.forEach(item => {
      const symbol = this.currencySymbol(item);
      const amount = Number(item.price ?? item.Price ?? 0);
      if (!Number.isFinite(amount)) return;
      totals.set(symbol, (totals.get(symbol) || 0) + amount);
    });

    return Array.from(totals.entries()).map(([symbol, amount]) => ({ symbol, amount }));
  }
  changeOrdersPage(page: number) {
    const total = this.ordersTotalPages();
    if (page < 1 || page > total || page === this.ordersPage() || this.loadingOrders()) return;
    this.loadOrders(this.ordersUserId, page);
  }

  orderPageNumbers(): number[] {
    const total = this.ordersTotalPages();
    const current = this.ordersPage();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  ordersRangeLabel(): string {
    const total = this.ordersTotalItems();
    if (total === 0) return '0 compras';
    const start = (this.ordersPage() - 1) * this.ordersPageSize() + 1;
    const end = Math.min(start + this.userOrders().length - 1, total);
    return `${start}-${end} de ${total}`;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validar tamaño del archivo (ej: 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        this.notify.show('error', 'La imagen es muy pesada. Por favor, sube una imagen de menos de 2MB.');
        if (event.target) event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = this.sanitizer.bypassSecurityTrustUrl(e.target.result);
      };
      reader.readAsDataURL(file);
      this.userService.updateMyImage(file).subscribe({
        next: (res) => {
          if (res.success) {
            this.notify.show('success', 'Imagen de perfil actualizada');
            this.loadProfile();
          } else {
            this.notify.show('error', res.errors?.[0] || 'Error al subir imagen');
          }
        },
        error: () => {
          this.notify.show('error', 'Error al conectar con el servidor para subir la imagen');
        }
      });
    }
  }

  onImageError() {
    this.hasImageError.set(true);
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.notify.show('error', 'Completa los campos obligatorios');
      return;
    }
    this.saving.set(true);
    const val = this.profileForm.value;
    const payload: UpdateProfilePayload = {
      firstName: val.firstName,
      lastName: val.lastName,
      phone: val.phone,
      birth: val.birth,
      observation: val.observation,
    };
    this.userService.updateMe(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.show('success', 'Perfil actualizado correctamente');
          this.loadProfile();
        } else {
          this.notify.show('error', res.errors?.[0] || 'Error al actualizar perfil');
        }
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }

  private extractUserIdFromToken(): string {
    if (typeof window === 'undefined') return '';
    let tokenClaims = localStorage.getItem('CookieTokenClaims');
    if (!tokenClaims) {
      const name = 'CookieTokenClaims';
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) tokenClaims = parts.pop()?.split(';').shift() || '';
    }
    if (!tokenClaims) tokenClaims = localStorage.getItem('token') || '';
    if (!tokenClaims) return '';
    try {
      tokenClaims = decodeURIComponent(tokenClaims);
      let jsonString: string;
      if (tokenClaims.includes('.')) {
        const payload = tokenClaims.split('.')[1];
        jsonString = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      } else {
        jsonString = atob(tokenClaims);
      }
      const userData = JSON.parse(jsonString);
      const isValid = (idStr: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr) || /^\d+$/.test(idStr);
      const possibleKeys = [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/userdata',
        'nameid', 'sub', 'UserID', 'UserId', 'userid', 'userId', 'Id', 'id', 'ID'
      ];
      for (const key of possibleKeys) {
        if (userData[key]) {
          const val = String(userData[key]).trim();
          if (isValid(val)) return val;
        }
      }
      return '';
    } catch (e) {
      return '';
    }
  }

  cleanDescription(desc: string | undefined): string {
    if (!desc) return '';
    // Eliminar el tag [ADMIN:uuid]
    const cleaned = desc.replace(/\[ADMIN:[a-f0-9-]+\]\s*/i, '').trim();
    return cleaned;
  }
}
