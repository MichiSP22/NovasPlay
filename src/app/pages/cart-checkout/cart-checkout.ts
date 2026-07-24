import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { CartService } from '../../core/state/cart.service';
import { ItemCarrito } from '../../core/state/cart.model';
import { PaymentService, PaymentData } from '../../entities/payment';
import { OrderService } from '../../entities/order';
import { NotificationService } from '../../shared/ui/toast/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { CyberDatepickerComponent } from '../../shared/components/cyber-datepicker/cyber-datepicker';
import { CyberTimepickerComponent } from '../../shared/components/cyber-timepicker/cyber-timepicker';
import { CompanyConfigService } from '../../entities/company-config';
import { CouponPreviewLine, CouponPreviewResult, CouponService } from '../../entities/coupon';

@Component({
  selector: 'app-cart-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, CyberDatepickerComponent, CyberTimepickerComponent],
  templateUrl: './cart-checkout.html',
  styleUrls: ['./cart-checkout.css']
})
export class CartCheckoutComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  public cartService = inject(CartService);
  private paymentService = inject(PaymentService);
  private orderService = inject(OrderService);
  private notify = inject(NotificationService);
  private authService = inject(AuthService);
  private configService = inject(CompanyConfigService);
  private couponService = inject(CouponService);

  // Agrupamiento por Método de Pago (Esto separa por Banco/Cuenta)
  groupedItems = computed(() => {
    const groups = new Map<number, { methodId: number, name: string, items: ItemCarrito[], subtotal: number, symbol: string }>();
    this.cartService.items().forEach(item => {
      let group = groups.get(item.metodoPagoId);
      if (!group) {
        group = { 
          methodId: item.metodoPagoId, 
          name: item.metodoPagoNombre, 
          items: [], 
          subtotal: 0, 
          symbol: item.paquete.simbolo || '$' 
        };
        groups.set(item.metodoPagoId, group);
      }
      group.items.push(item);
      const priceToUse = item.paquete.promotion ? item.paquete.promotionPrice : item.paquete.precio;
      let val = parseFloat(priceToUse.toString().replace(',', '.'));
      group.subtotal += isNaN(val) ? 0 : val;
    });
    return Array.from(groups.values());
  });

  // Datos bancarios cargados para cada método 
  bankData = signal<{ [key: number]: PaymentData[] }>({});
  
  // Referencias ingresadas por el usuario para cada método
  references = signal<{ [key: number]: string }>({});
  
  // Fechas y horas de pago por cada método
  paymentDates = signal<{ [key: number]: string }>({});
  paymentTimes = signal<{ [key: number]: string }>({});

  couponCode = '';
  couponPreview = signal<CouponPreviewResult | null>(null);
  couponLoading = signal<boolean>(false);
  couponMessage = signal<string>('');
  

  cargando = signal<boolean>(true);
  procesando = signal<boolean>(false);
  authRequiredNotice = signal<boolean>(false);
  private authChangedSubscription: Subscription | null = null;

  ngOnInit() {
    if (this.cartService.itemCount() === 0) {
      this.notify.show('error', 'Tu carrito está vacío.');
      this.router.navigate(['/']);
      return;
    }
    this.authChangedSubscription = this.authService.authChanged.subscribe(() => {
      this.authRequiredNotice.set(false);
      this.loadBankDataForAllMethods();
    });

    if (!this.checkSession()) return;

    this.loadBankDataForAllMethods();
  }

  ngOnDestroy() {
    this.authChangedSubscription?.unsubscribe();
    this.authChangedSubscription = null;
  }

  checkSession(): boolean {
    if (this.authService.hasSession()) return true;
    this.authRequiredNotice.set(true);
    this.cargando.set(false);
    this.authService.openAuth('register', 'Crea tu cuenta para confirmar esta compra. Tu carrito sigue guardado y podras completar el pago al terminar.');
    return false;
  }

  openAuthFromCheckout(mode: 'login' | 'register' = 'register') {
    this.authRequiredNotice.set(true);
    const notice = mode === 'register'
      ? 'Crea tu cuenta para confirmar esta compra. Tu carrito sigue guardado y podras completar el pago al terminar.'
      : 'Inicia sesion para confirmar esta compra. Tu carrito sigue guardado aqui.';
    this.authService.openAuth(mode, notice);
  }

  loadBankDataForAllMethods() {
    this.cargando.set(true);
    const groups = this.groupedItems();
    let loadedCount = 0;
    
    if (groups.length === 0) {
      this.cargando.set(false);
      return;
    }

    const currentBankData = { ...this.bankData() };
    const currentRefs = { ...this.references() };
    const currentDates = { ...this.paymentDates() };
    const currentTimes = { ...this.paymentTimes() };


    // Obtener fecha y hora actual en formato local real
    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-'); // YYYY-MM-DD local
    const localTime = now.toTimeString().slice(0, 5); // HH:mm local

    groups.forEach(group => {
      const id = group.methodId;
      if (currentRefs[id] === undefined) {
          currentRefs[id] = '';
      }
      if (currentDates[id] === undefined) {
          currentDates[id] = localDate;
      }
      if (currentTimes[id] === undefined) {
          currentTimes[id] = localTime;
      }

      this.paymentService.searchData(id).subscribe({
        next: (res) => {
          if (res.success && res.value?.items) {
            currentBankData[id] = res.value.items;
          }
        },
        error: (err) => {
          console.error(`Error loading data for method ${id}`, err);
        },
        complete: () => {
          loadedCount++;
          if (loadedCount === groups.length) {
            this.bankData.set(currentBankData);
            this.references.set(currentRefs);
            this.paymentDates.set(currentDates);
            this.paymentTimes.set(currentTimes);

            this.cargando.set(false);
          }
        }
      });
    });
  }

  updateReference(methodId: number, event: Event) {
      const inputElement = event.target as HTMLInputElement;
      if (inputElement) {
          this.references.update(refs => {
              refs[methodId] = inputElement.value;
              return { ...refs };
          });
      }
  }



  updatePaymentDateValue(methodId: number, val: string) {
    this.paymentDates.update(dates => {
      dates[methodId] = val;
      return { ...dates };
    });
  }

  updatePaymentTimeValue(methodId: number, val: string) {
    this.paymentTimes.update(times => {
      times[methodId] = val;
      return { ...times };
    });
  }

  applyCoupon() {
    if (this.couponLoading()) return;

    const code = this.couponCode.trim().toUpperCase();
    if (!code) {
      this.notify.show('error', 'Ingresa un codigo de cupon.');
      return;
    }

    const lines = this.buildCouponPreviewLines();
    if (lines.length === 0) {
      this.notify.show('error', 'No hay productos para aplicar el cupon.');
      return;
    }

    this.couponLoading.set(true);
    this.couponMessage.set('');

    this.couponService.preview(code, lines).subscribe({
      next: (res) => {
        const preview = res.value;
        if (res?.success && preview?.valid) {
          this.couponCode = preview.code;
          this.couponPreview.set(preview);
          this.couponMessage.set(preview.message);
          this.notify.show('success', preview.message || 'Cupon aplicado correctamente.');
        } else {
          this.couponPreview.set(null);
          const message = preview?.message || this.extractErrorMessage(res);
          this.couponMessage.set(message);
          this.notify.show('error', message);
        }
        this.couponLoading.set(false);
      },
      error: (err) => {
        const message = this.extractErrorMessage(err?.error);
        this.couponPreview.set(null);
        this.couponMessage.set(message);
        this.notify.show('error', message);
        this.couponLoading.set(false);
      }
    });
  }

  removeCoupon() {
    this.couponCode = '';
    this.couponPreview.set(null);
    this.couponMessage.set('');
  }

  couponFinalTotals() {
    const preview = this.couponPreview();
    return preview?.totalsBySymbol?.length ? preview.totalsBySymbol : this.cartService.totalsBySymbol();
  }

  couponDiscounts() {
    return this.couponPreview()?.discountBySymbol || [];
  }

  hasCouponDiscount(): boolean {
    return this.couponDiscounts().some(item => item.amount > 0);
  }

  confirmOrder() {
    if (this.configService.maintenanceMode()) {
      this.notify.show('error', 'El sistema se encuentra en mantenimiento. No es posible procesar pedidos en este momento.');
      return;
    }

    if (!this.checkSession()) return;

    // Validar referencias
    let missingRef = false;
    for (const group of this.groupedItems()) {
      if (!this.references()[group.methodId] || this.references()[group.methodId].trim() === '') {
        missingRef = true;
        break;
      }
    }

    if (missingRef) {
      this.notify.show('error', 'Debes ingresar el Número de Referencia para todos los bloques de pago.');
      return;
    }

    if (this.couponCode.trim() && !this.couponPreview()) {
      this.notify.show('error', 'Aplica el cupon antes de confirmar el pago.');
      return;
    }

    this.procesando.set(true);

    const formData = new FormData();
    const allItems = this.cartService.items();
    const appliedCoupon = this.couponPreview();

    if (appliedCoupon?.valid) {
      formData.append('CouponCode', appliedCoupon.code);
      formData.append('CouponPreview', JSON.stringify({
        discountBySymbol: appliedCoupon.discountBySymbol,
        totalsBySymbol: appliedCoupon.totalsBySymbol,
      }));
      if (appliedCoupon.couponId) {
        formData.append('CouponID', appliedCoupon.couponId.toString());
      }
    }
    
    // 1. Agregar Items
    allItems.forEach((item, index) => {
      formData.append(`Items[${index}].DetailID`, item.paquete.id.toString());
      formData.append(`Items[${index}].PaymentID`, item.metodoPagoId.toString());
      formData.append(`Items[${index}].Data[0].Key`, 'Cuenta');
      formData.append(`Items[${index}].Data[0].Value`, item.idUsuario || '');
      
      const ref = this.references()[item.metodoPagoId];
      formData.append(`Items[${index}].Reference`, ref);

      // 1. Obtener el offset UTC local actual del navegador (ej: -04:00 para Vzla)
      const now = new Date();
      const tzo = -now.getTimezoneOffset();
      const dif = tzo >= 0 ? '+' : '-';
      const pad = (num: number) => num.toString().padStart(2, '0');
      const timezoneOffset = `${dif}${pad(Math.floor(Math.abs(tzo) / 60))}:${pad(Math.abs(tzo) % 60)}`;

      // 2. Combinar fecha y hora seleccionada con el offset
      const userDate = this.paymentDates()[item.metodoPagoId];
      const userTime = this.paymentTimes()[item.metodoPagoId];
      const combinedDateTime = `${userDate}T${userTime}:00${timezoneOffset}`;
      
      formData.append(`Items[${index}].PaymentDate`, combinedDateTime);

      if (appliedCoupon?.valid) {
        formData.append(`Items[${index}].CouponCode`, appliedCoupon.code);
      }
    });



    this.orderService.create(formData).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.show('success', '¡Orden creada con éxito!');
          this.cartService.clearCart(); 
          this.router.navigate(['/profile'], { queryParams: { tab: 'ordenes' } });
        } else {
          let devErr = '';
          if (res.response) devErr = res.response;
          else if (res.errors && res.errors.length > 0) devErr = res.errors[0];

          if (devErr && typeof devErr === 'string') {
            const snippet = devErr.replace(/<[^>]*>?/gm, '').trim().split('\n')[0].substring(0, 50);
            this.notify.show('error', `Ocurrió un error al procesar el pedido (${snippet}...).`);
          } else {
            this.notify.show('error', 'Ocurrió un error al procesar el pedido.');
          }
        }
        this.procesando.set(false);
      },
      error: (err) => {
        console.error('Error enviando la orden combinada:', err);
        if (err.status === 413) {
          this.notify.show('error', 'La imagen es muy pesada y no pudo ser enviada. Intenta con una imagen más pequeña.');
        } else {
          let devErr = '';
          try {
            const data = err?.error || err;
            if (typeof data === 'string') {
               devErr = data;
            } else if (data?.response) {
               devErr = data.response;
            } else if (data?.message) {
               devErr = data.message;
            } else if (data?.title) {
               devErr = data.title;
            } else if (err?.message) {
               devErr = err.message;
            }
          } catch(e) {}
          
          if (devErr && typeof devErr === 'string') {
            const snippet = devErr.replace(/<[^>]*>?/gm, '').trim().split('\n')[0].substring(0, 50);
            this.notify.show('error', `Ocurrió un error al procesar el pedido. Verifica tu conexión (${snippet}...).`);
          } else {
            this.notify.show('error', 'Ocurrió un error al procesar el pedido. Verifica tu conexión.');
          }
        }
        this.procesando.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }

  private buildCouponPreviewLines(): CouponPreviewLine[] {
    return this.cartService.items().map(item => {
      const priceToUse = item.paquete.promotion ? item.paquete.promotionPrice : item.paquete.precio;
      return {
        detailID: item.paquete.id,
        paymentID: item.metodoPagoId,
        price: this.parsePrice(priceToUse),
        symbol: item.paquete.simbolo || '$',
        productName: item.juego,
        detailName: item.paquete.cant,
      };
    });
  }

  private parsePrice(value: string | number): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

    const raw = String(value ?? '').trim().replace(/\s/g, '');
    if (!raw) return 0;

    const commaIndex = raw.lastIndexOf(',');
    const dotIndex = raw.lastIndexOf('.');
    let normalized = raw;

    if (commaIndex >= 0 && dotIndex >= 0) {
      const decimalSeparator = commaIndex > dotIndex ? ',' : '.';
      const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
      normalized = raw
        .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
        .replace(decimalSeparator, '.');
    } else if (commaIndex >= 0) {
      normalized = raw.replace(',', '.');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractErrorMessage(payload: any): string {
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return payload.errors.filter(Boolean).join(' | ');
    }
    if (typeof payload?.response === 'string' && payload.response.trim()) return payload.response.trim();
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
    return 'No se pudo aplicar el cupon.';
  }
}
