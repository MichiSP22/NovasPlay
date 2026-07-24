import { Component, OnInit, OnDestroy, signal, computed, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NoCachePipe } from '../../shared/pipes/no-cache.pipe';
import { ProductService, Product } from '../../entities/product';
import { RechargeService } from '../../entities/recharge';
import { PriceService } from '../../entities/price';
import { PaymentService } from '../../entities/payment';
import { CountryService } from '../../entities/country';
import { CartService } from '../../core/state/cart.service';
import { NotificationService } from '../../shared/ui/toast/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { UserService } from '../../entities/user';
import { CompanyConfigService } from '../../entities/company-config';

interface Paquete {
  id: number;
  cant: string;
  precio: string;
  simbolo: string;
  imageUrl?: string;
  soldOut: boolean;
  promotion: boolean;
  promotionPrice: string;
}

@Component({
  selector: 'app-chekout',
  standalone: true,
  imports: [CommonModule, FormsModule, NoCachePipe],
  templateUrl: './chekout.html',
  styleUrl: './chekout.css',
})
export class Chekout implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  public router = inject(Router);

  private productService = inject(ProductService);
  private rechargeService = inject(RechargeService);
  private priceService = inject(PriceService);
  private paymentService = inject(PaymentService);
  private countryService = inject(CountryService);
  public cartService = inject(CartService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private configService = inject(CompanyConfigService);

  telefonoInvalido = signal<boolean>(false);
  authRequiredNotice = signal<boolean>(false);
  idAttention = signal<boolean>(false);
  novixMessageIndex = signal<number>(0);
  novixPrompt = signal<string | null>(null);
  novixReaction = signal<'idle' | 'warn' | 'success'>('idle');
  novixPulse = signal<number>(0);
  private novixMessageTimer: number | null = null;
  private novixReactionTimer: number | null = null;
  private authChangedSubscription: Subscription | null = null;

  juego = signal<Product | null>(null);
  juegoNombre = computed(() => this.juego()?.name || 'Cargando...');

  idUsuario = '';
  emailUsuario = '';

  paqueteSeleccionado = signal<Paquete | null>(null);
  metodoPagoSeleccionado = signal<number | null>(null);
  metodoPagoSeleccionadoNombre = signal<string>('');

  allMetodosDePago = signal<any[]>([]);
  metodosDePago = computed(() => this.getVisiblePaymentMethods());
  selectedCountryIso = signal<string>('GL');
  selectedCountryCoinIds = signal<number[] | null>(null);
  countryFilterReady = signal<boolean>(false);
  countryPaymentHint = computed(() => {
    if (this.selectedCountryIso() === 'GL') return '';
    if (this.selectedCountryCoinIds() === null) {
      return 'Mostrando metodos disponibles e internacionales.';
    }
    return 'Mostrando metodos locales del pais e internacionales.';
  });

  carrito = this.cartService.items;
  paquetesDinamicos = signal<Paquete[]>([]);
  cargandoInfo = signal<boolean>(true);
  generandoOrden = signal<boolean>(false);
  reference = signal<string>('');
  totalsCarrito = this.cartService.totalsBySymbol;

  private readonly paymentVisibilityEffect = effect(() => {
    const visiblePaymentIds = new Set(this.metodosDePago().map(metodo => this.getPaymentId(metodo)));
    const selectedPaymentId = this.metodoPagoSeleccionado();

    if (selectedPaymentId && !visiblePaymentIds.has(selectedPaymentId)) {
      untracked(() => {
        this.metodoPagoSeleccionado.set(null);
        this.metodoPagoSeleccionadoNombre.set('');
        this.paqueteSeleccionado.set(null);
        this.paquetesDinamicos.set([]);
      });
    }
  });

  private readonly countryChangeHandler = (event: Event) => {
    const detail = (event as CustomEvent<{ isoCode?: string }>).detail;
    this.loadSelectedCountryConfig(detail?.isoCode);
  };

  ngOnInit() {
    if (typeof window !== 'undefined') {
      window.addEventListener('novasplay:country-changed', this.countryChangeHandler);
      this.startNovixMessageLoop();
    }
    this.authChangedSubscription = this.authService.authChanged.subscribe(() => {
      this.authRequiredNotice.set(false);
      this.loadCurrentUserPhoneStatus();
    });

    this.loadSelectedCountryConfig();

    const idProductoStr = this.route.snapshot.paramMap.get('id');
    if (idProductoStr) {
      this.cargarDatosCompletos(parseInt(idProductoStr, 10));
    } else {
      this.volver();
    }
    this.loadCurrentUserPhoneStatus();
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('novasplay:country-changed', this.countryChangeHandler);
      if (this.novixMessageTimer !== null) {
        window.clearInterval(this.novixMessageTimer);
        this.novixMessageTimer = null;
      }
      if (this.novixReactionTimer !== null) {
        window.clearTimeout(this.novixReactionTimer);
        this.novixReactionTimer = null;
      }
    }
    this.authChangedSubscription?.unsubscribe();
    this.authChangedSubscription = null;
  }

  cargarDatosCompletos(productoId: number) {
    this.cargandoInfo.set(true);

    this.productService.search({ pageNumber: 1, pageSize: 100 }).subscribe(resProd => {
      if (resProd?.success && resProd.value) {
        const prod = (resProd.value.items as any[]).find(p => p.Id === productoId || p.id === productoId);
        if (prod) {
          this.juego.set({
            id: prod.Id || prod.id,
            name: prod.Name || prod.name,
            description: prod.Description || prod.description,
            timeMinRecharge: prod.TimeMinDetail || prod.timeMinDetail || '00:05:00',
            timeMaxRecharge: prod.TimeMaxDetail || prod.timeMaxDetail || '00:15:00',
            soldOut: prod.SoldOut || prod.soldOut || false,
            internalProcess: prod.InternalProcess || prod.internalProcess || false,
            imageInfo: {
              imageURL: this.normalizeAssetUrl(prod.ImageURL || prod.imageURL || prod.imageUrl || prod.ImageInfo?.ImageURL || prod.imageInfo?.imageURL || ''),
              iconURL: this.normalizeAssetUrl(prod.IconURL || prod.iconURL || prod.iconUrl || prod.ImageInfo?.IconURL || prod.imageInfo?.iconURL || ''),
            },
            iconInfo: {
              iconURL: this.normalizeAssetUrl(prod.IconURL || prod.iconURL || prod.iconUrl || prod.IconInfo?.IconURL || prod.iconInfo?.iconURL || prod.ImageInfo?.IconURL || prod.imageInfo?.iconURL || ''),
            },
            categories: Array.isArray(prod.ProductsCategories_Category_Name)
              ? prod.ProductsCategories_Category_Name
              : (prod.ProductsCategories_Category_Name ? [prod.ProductsCategories_Category_Name] : []),
          });

          if (prod.InternalProcess || prod.internalProcess) {
            this.idUsuario = 'Interno';
          }
        }
      }
    });

    this.paymentService.search(1, 100).subscribe(res => {
      if (res?.success && res.value) {
        const methods = ((res.value.items as any[]) || []).map(item => this.normalizePaymentMethod(item));
        this.allMetodosDePago.set(methods);
      }
      this.cargandoInfo.set(false);
    });
  }

  private loadSelectedCountryConfig(isoFromEvent?: string) {
    const iso = (isoFromEvent || (typeof window !== 'undefined'
      ? localStorage.getItem('novasplay_country_iso')
      : '') || 'GL').toUpperCase();

    this.selectedCountryIso.set(iso || 'GL');
    this.selectedCountryCoinIds.set(null);
    this.countryFilterReady.set(false);

    if (!iso || iso === 'GL') {
      this.countryFilterReady.set(true);
      return;
    }

    this.countryService.search({ pageNumber: 1, pageSize: 100, select: [] }).subscribe({
      next: (res) => {
        const items = (res?.value?.items || []) as any[];
        const country = items.find(item => {
          const countryIso = (item.isoCode ?? item.IsoCode ?? '').toString().toUpperCase();
          return countryIso === iso;
        });

        this.selectedCountryCoinIds.set(country ? this.extractCountryCoinIds(country) : null);
        this.countryFilterReady.set(true);
      },
      error: () => {
        this.selectedCountryCoinIds.set(null);
        this.countryFilterReady.set(true);
      },
    });
  }

  private normalizePaymentMethod(item: any): any {
    const id = Number(item.id ?? item.Id);
    const coinID = Number(item.coinID ?? item.CoinID ?? item.coinId ?? item.CoinId);
    const imageURL = this.normalizeAssetUrl(
      item.ImageURL ||
      item.imageURL ||
      item.imageUrl ||
      item.ImageInfo?.ImageURL ||
      item.imageInfo?.imageURL ||
      ''
    );

    return {
      ...item,
      id,
      Id: id,
      coinID,
      CoinID: coinID,
      name: item.name ?? item.Name,
      Name: item.Name ?? item.name,
      international: this.coerceBoolean(item.international ?? item.International),
      International: this.coerceBoolean(item.International ?? item.international),
      ImageURL: imageURL || item.ImageURL || item.imageURL || item.imageUrl,
    };
  }

  private getVisiblePaymentMethods(): any[] {
    const methods = this.allMetodosDePago();
    const iso = this.selectedCountryIso();
    const allowedCoinIds = this.selectedCountryCoinIds();

    if (!iso || iso === 'GL' || allowedCoinIds === null) {
      return methods;
    }

    return methods.filter(metodo => {
      if (this.isInternationalPayment(metodo)) return true;
      const coinId = this.getPaymentCoinId(metodo);
      return coinId !== null && allowedCoinIds.includes(coinId);
    });
  }

  getPaymentId(metodo: any): number {
    return Number(metodo?.id ?? metodo?.Id ?? 0);
  }

  getPaymentCoinId(metodo: any): number | null {
    const coinId = Number(metodo?.coinID ?? metodo?.CoinID ?? metodo?.coinId ?? metodo?.CoinId);
    return Number.isFinite(coinId) && coinId > 0 ? coinId : null;
  }

  getPaymentImageUrl(metodo: any): string {
    return metodo?.ImageURL || metodo?.imageURL || metodo?.imageUrl || '';
  }

  isInternationalPayment(metodo: any): boolean {
    return this.coerceBoolean(metodo?.international ?? metodo?.International);
  }

  private extractCountryCoinIds(country: any): number[] | null {
    const ids = new Set<number>();
    let foundRelation = false;

    const flatKeys = [
      'coinIds',
      'CoinIds',
      'coinIDs',
      'CoinIDs',
      'relatedIDs',
      'RelatedIDs',
      'CountriesCoins_CoinID',
      'countriesCoins_CoinID',
      'CountryCoins_CoinID',
      'countryCoins_CoinID',
      'CountriesCoins_Coin_Id',
      'CountryCoins_Coin_Id',
      'Coins_Id',
      'Coins_ID',
    ];

    flatKeys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(country, key)) {
        foundRelation = true;
        this.collectCoinIds(country[key], ids, true);
      }
    });

    const relationKeys = [
      'coins',
      'Coins',
      'countryCoins',
      'CountryCoins',
      'countriesCoins',
      'CountriesCoins',
      'countriesCoin',
      'CountriesCoin',
    ];

    relationKeys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(country, key)) {
        foundRelation = true;
        this.collectCoinIds(country[key], ids, key.toLowerCase() === 'coins');
      }
    });

    return foundRelation ? Array.from(ids) : null;
  }

  private collectCoinIds(value: any, ids: Set<number>, allowPlainId: boolean) {
    if (value === null || value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach(item => this.collectCoinIds(item, ids, allowPlainId));
      return;
    }

    if (typeof value === 'number') {
      if (Number.isFinite(value) && value > 0) ids.add(value);
      return;
    }

    if (typeof value === 'string') {
      value.split(',').map(part => Number(part.trim())).forEach(id => {
        if (Number.isFinite(id) && id > 0) ids.add(id);
      });
      return;
    }

    if (typeof value !== 'object') return;

    const candidates = [
      value.CoinID,
      value.coinID,
      value.CoinId,
      value.coinId,
      value.FKCoinID,
      value.fKCoinID,
      value.FKCoin_ID,
      value.fKCoin_ID,
      value.Coin?.Id,
      value.Coin?.id,
      value.coin?.Id,
      value.coin?.id,
      allowPlainId ? value.Id : undefined,
      allowPlainId ? value.id : undefined,
    ];

    candidates.map(candidate => Number(candidate)).forEach(id => {
      if (Number.isFinite(id) && id > 0) ids.add(id);
    });
  }

  private coerceBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'si', 'on', 'activo', 'active'].includes(value.trim().toLowerCase());
    }
    return false;
  }

  private normalizeAssetUrl(value: string): string {
    let cleanUrl = (value || '').trim();
    if (!cleanUrl) return '';

    cleanUrl = cleanUrl.replace(/^https?:\/\/(https?:\/\/)?/, 'https://');
    if (cleanUrl.startsWith('https//')) cleanUrl = 'https://' + cleanUrl.slice(7);
    cleanUrl = cleanUrl.replace('.dev//', '.dev/');

    return cleanUrl;
  }

  formatWaitTime(timeStr: string): string {
    if (!timeStr) return '0 min';
    const [h, m] = timeStr.split(':').map(val => parseInt(val, 10) || 0);
    if (h === 0 && m === 0) return 'Inmediato';
    let result = '';
    if (h > 0) result += `${h}h `;
    if (m > 0 || h === 0) result += `${m} min`;
    return result.trim();
  }

  cargarPaquetesPorMetodoPago(productoId: number, metodoPagoId: number) {
    this.cargandoInfo.set(true);
    this.paqueteSeleccionado.set(null);
    this.paquetesDinamicos.set([]);

    this.rechargeService.search({
      pageNumber: 1,
      pageSize: 100,
      filters: [{ field: 'ProductID', operator: 0, value: productoId }],
    } as any).subscribe({
      next: (resRecargas) => {
        if (!(resRecargas?.success && resRecargas.value)) {
          this.cargandoInfo.set(false);
          return;
        }

        const recargasDelJuego = (resRecargas.value.items as any[]) || [];
        const detailIds = recargasDelJuego
          .map(r => Number(r.Id ?? r.id))
          .filter(id => Number.isFinite(id) && id > 0);

        if (detailIds.length === 0) {
          this.paquetesDinamicos.set([]);
          this.cargandoInfo.set(false);
          return;
        }

        this.priceService.search({
          pageNumber: 1,
          pageSize: 500,
          filters: [
            { field: 'PaymentID', operator: 0, value: metodoPagoId },
            { field: 'DetailID', operator: 9, value: detailIds },
          ],
        } as any).subscribe({
          next: (resPrices) => {
            const priceItems = (resPrices?.success && resPrices.value?.items)
              ? (resPrices.value.items as any[])
              : [];

            const rechargeById = new Map<number, any>(
              recargasDelJuego.map(r => [Number(r.Id ?? r.id), r])
            );

            const paquetesArmados: Paquete[] = priceItems
              .map((price: any) => {
                const detailId = Number(price.DetailID ?? price.detailID ?? price.FKDetail_ID ?? price.fKDetail_ID);
                const recarga = rechargeById.get(detailId);
                if (!recarga) return null;

                const promotion = price.Promotion === true || price.Promotion === 'true' || price.promotion === true;
                const symbol = price.Payment_Coin_Symbol || price.payment_Coin_Symbol || price.CoinSymbol || '$';

                return {
                  id: detailId,
                  cant: recarga.Name || recarga.name || `Recarga #${detailId}`,
                  precio: String(price.Price ?? price.price ?? 0),
                  simbolo: String(symbol || '$'),
                  imageUrl: recarga.ImageURL || recarga.imageURL || recarga.ImageUrl,
                  soldOut: !!(recarga.SoldOut || recarga.soldOut),
                  promotion,
                  promotionPrice: String(price.PromotionPrice ?? price.promotionPrice ?? 0),
                } as Paquete;
              })
              .filter((p): p is Paquete => !!p);

            this.paquetesDinamicos.set(paquetesArmados);
            this.cargandoInfo.set(false);
          },
          error: () => {
            this.paquetesDinamicos.set([]);
            this.cargandoInfo.set(false);
          },
        });
      },
      error: () => {
        this.paquetesDinamicos.set([]);
        this.cargandoInfo.set(false);
      },
    });
  }

  seleccionarPaquete(p: Paquete) {
    if (p.soldOut) return;
    this.paqueteSeleccionado.set(p);
    this.triggerNovixReaction('success', 'Paquete marcado. Si todo esta bien, agregalo a la lista.');
  }

  seleccionarPago(metodo: any) {
    const id = this.getPaymentId(metodo);
    const name = metodo.Name || metodo.name;
    this.triggerNovixReaction('success', 'Metodo listo. Ya puedes escoger tu paquete.');
    this.metodoPagoSeleccionado.set(id);
    this.metodoPagoSeleccionadoNombre.set(name);
    const prodId = this.juego()?.id;
    if (prodId) {
      this.cargarPaquetesPorMetodoPago(prodId, id);
    }
  }

  agregarAlCarrito() {
    if (!this.idUsuario.trim()) {
      this.triggerNovixReaction('warn', 'Ey, falta tu ID. Colocalo primero para evitar errores.');
      this.idAttention.set(true);
      this.notificationService.show('error', 'Debes ingresar tu User ID (Paso 01) antes de agregar al carrito.');
      this.focusRechargeStep('accountStep', 'playerIdInput', true);
      return;
    }
    if (!this.metodoPagoSeleccionado()) {
      this.triggerNovixReaction('warn', 'Aun falta el metodo de pago. Escoge uno y seguimos.');
      this.notificationService.show('error', 'Debes seleccionar un metodo de pago antes de agregar la recarga.');
      this.focusRechargeStep('paymentStep');
      return;
    }
    if (!this.paqueteSeleccionado()) {
      this.triggerNovixReaction('warn', 'Te falta elegir el paquete. Toca una opcion antes de agregar.');
      this.notificationService.show('error', 'Debes seleccionar un paquete (Paso 03) para anadirlo.');
      this.focusRechargeStep('packageStep');
      return;
    }

    this.cartService.addItem({
      juego: this.juegoNombre(),
      idUsuario: this.idUsuario,
      paquete: this.paqueteSeleccionado()!,
      metodoPagoId: this.metodoPagoSeleccionado()!,
      metodoPagoNombre: this.metodoPagoSeleccionadoNombre(),
    });

    this.notificationService.show('success', 'Recarga agregada al carrito.');
    this.paqueteSeleccionado.set(null);
    this.triggerNovixReaction('success', 'Recarga agregada. La deje lista en tu resumen.');
  }

  eliminarDelCarrito(idInterno: number) {
    this.cartService.removeItem(idInterno);
  }

  confirmarFinal() {
    if (this.configService.maintenanceMode()) {
      this.notificationService.show('error', 'El sistema se encuentra en mantenimiento. No es posible realizar compras en este momento.');
      return;
    }

    if (!this.authService.hasSession()) {
      this.requestPurchaseAuth();
      return;
    }

    if (this.carrito().length === 0) {
      this.notificationService.show('error', 'Tu lista de recargas esta vacia.');
      return;
    }
    this.router.navigate(['/cart-checkout']);
  }

  openAuthFromCheckout(mode: 'login' | 'register' = 'register') {
    this.authRequiredNotice.set(true);
    const notice = mode === 'register'
      ? 'Crea tu cuenta para continuar con esta compra. Tu recarga queda lista mientras completas el registro.'
      : 'Inicia sesion para continuar con esta compra. Tu recarga sigue guardada aqui.';
    this.authService.openAuth(mode, notice);
  }

  private requestPurchaseAuth() {
    this.authRequiredNotice.set(true);
    this.triggerNovixReaction('warn', 'Crea tu cuenta para continuar la compra aqui mismo.');
    this.authService.openAuth('register', 'Crea tu cuenta para seguir con tu compra. Tu seleccion se queda aqui y podras continuar sin empezar de nuevo.');
  }

  private loadCurrentUserPhoneStatus() {
    if (!this.authService.hasSession()) {
      this.telefonoInvalido.set(false);
      return;
    }

    this.userService.getMe().subscribe({
      next: (res) => {
        if (res?.success && res.value) {
          const phone = (res.value.phone || '').replace(/\s/g, '');
          this.telefonoInvalido.set(/^\+0+$/.test(phone) || phone === '');
        }
      },
      error: () => {
        this.telefonoInvalido.set(false);
      }
    });
  }

  novixMessages(): string[] {
    if (this.cargandoInfo() && !this.juego()) {
      return [
        'Estoy preparando esta recarga.',
        'Ya casi cargo las opciones.',
        'Reviso que todo quede listo.'
      ];
    }

    if (this.juego() && !this.juego()?.internalProcess && !this.idUsuario.trim()) {
      return [
        'Coloca tu ID para cargar sin errores.',
        'Revisa que no falte ningun numero.',
        'Tu ID es la llave de esta recarga.'
      ];
    }

    if (!this.metodoPagoSeleccionado()) {
      return [
        'Elige como quieres pagar.',
        'Al escoger metodo te muestro los paquetes.',
        'Vamos paso a paso, sin enredos.'
      ];
    }

    if (!this.paqueteSeleccionado()) {
      return [
        'Ahora escoge el paquete.',
        'Toca una opcion y la preparo.',
        'El resumen se actualiza al agregarlo.'
      ];
    }

    return [
      'Listo, esa recarga puede ir a la lista.',
      'Puedes agregarla y seguir comprando.',
      'Todo se vera en el resumen final.'
    ];
  }

  novixCurrentMessage(): string {
    const prompt = this.novixPrompt();
    if (prompt) return prompt;

    const messages = this.novixMessages();
    return messages[this.novixMessageIndex() % messages.length] || messages[0];
  }

  clearIdAttention() {
    const wasMissing = this.idAttention();
    if (this.idUsuario.trim()) {
      this.idAttention.set(false);
      if (wasMissing) {
        this.triggerNovixReaction('success', 'Perfecto, ya tengo el ID. Sigamos con el pago.');
      } else {
        this.resetNovixMessage();
      }
    }
  }

  private startNovixMessageLoop() {
    this.novixMessageTimer = window.setInterval(() => {
      if (this.novixPrompt()) return;

      const total = this.novixMessages().length;
      this.novixMessageIndex.update(index => (index + 1) % total);
    }, 4300);
  }

  private triggerNovixReaction(type: 'warn' | 'success', message: string) {
    this.novixPrompt.set(message);
    this.novixReaction.set(type);
    this.novixPulse.update(value => value + 1);
    this.novixMessageIndex.set(0);

    if (typeof window === 'undefined') return;

    if (this.novixReactionTimer !== null) {
      window.clearTimeout(this.novixReactionTimer);
    }

    this.novixReactionTimer = window.setTimeout(() => {
      this.novixPrompt.set(null);
      this.novixReaction.set('idle');
      this.novixReactionTimer = null;
    }, 5200);
  }

  private resetNovixMessage() {
    if (this.novixPrompt()) return;

    this.novixMessageIndex.set(0);
  }

  private focusRechargeStep(targetId: string, focusId?: string, revealNovix = false) {
    if (typeof document === 'undefined') return;

    const target = document.getElementById(targetId);

    if (revealNovix && typeof window !== 'undefined') {
      const guide = document.querySelector<HTMLElement>('.mission-board');
      const scrollTarget = guide || target;
      const headerOffset = window.innerWidth >= 760 ? 104 : 82;

      if (scrollTarget) {
        const top = scrollTarget.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
      }
    } else {
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (focusId) {
      window.setTimeout(() => {
        const input = document.getElementById(focusId) as HTMLElement | null;
        input?.focus({ preventScroll: true });
      }, revealNovix ? 560 : 420);
    }
  }

  volver() {
    this.router.navigate(['/']);
  }
}
