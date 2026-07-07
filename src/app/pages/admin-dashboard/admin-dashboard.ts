import { Component, inject, signal, computed } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CategoryManagerComponent } from '../admin/category-manager/category-manager';
import { CoinManagerComponent } from '../admin/coin-manager/coin-manager';
import { CountryManagerComponent } from '../admin/country-manager/country-manager';
import { PaymentManagerComponent } from '../admin/payment-manager/payment-manager';
import { ProductManagerComponent } from '../admin/product-manager/product-manager';
import { RechargeManagerComponent } from '../admin/recharge-manager/recharge-manager';
import { PriceManagerComponent } from '../admin/price-manager/price-manager';
import { CouponManagerComponent } from '../admin/coupon-manager/coupon-manager';
import { OrderManagerComponent } from '../admin/order-manager/order-manager';
import { UserManagerComponent } from '../admin/user-manager/user-manager';
import { UserProfileComponent } from '../user-profile/user-profile';
import { ConfigManagerComponent } from '../admin/config-manager/config-manager';
import { FormsModule } from '@angular/forms';
import { User, UserService } from '../../entities/user';
import { CartService } from '../../core/state/cart.service';
import { AuthService } from '../../core/auth/auth.service';
import { OrderService, Order } from '../../entities/order';
import { OnInit, ElementRef, ViewChild, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { ResponsiveService } from '../../core/platform/responsive.service';
import { DashboardService, ReportQuery } from '../../entities/dashboard';
import { Chart, registerables } from 'chart.js';
import { CyberDatepickerComponent } from '../../shared/components/cyber-datepicker/cyber-datepicker';
import { DataCacheService } from '../../core/cache/data-cache.service';


Chart.register(...registerables);
// -------------------------

interface Balance {
  moneda: string;
  monto: number;
  simbolo: string;
}

interface StatusMethodRow {
  methodName: string;
  statuses: { [status: string]: number };
  total: number;
}

type Secciones = 'dashboard' | 'clientes' | 'recargas' | 'productos' | 'monedas' | 'paises' | 'categorias' | 'pagos' | 'precios' | 'cupones' | 'ordenes' | 'perfil' | 'configuracion';


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CategoryManagerComponent,
    CoinManagerComponent,
    CountryManagerComponent,
    PaymentManagerComponent,
    ProductManagerComponent,
    RechargeManagerComponent,
    PriceManagerComponent,
    CouponManagerComponent,
    OrderManagerComponent,
    UserManagerComponent,
    UserProfileComponent,
    ConfigManagerComponent,
    CyberDatepickerComponent
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  private readonly adminSectionStorageKey = 'yona_admin_active_section';
  private readonly validSections: Secciones[] = ['dashboard', 'clientes', 'recargas', 'productos', 'monedas', 'paises', 'categorias', 'pagos', 'precios', 'cupones', 'ordenes', 'perfil', 'configuracion'];
  private readonly supportSections = new Set<Secciones>(['dashboard', 'clientes', 'ordenes', 'perfil']);
  protected Math = Math;
  private router = inject(Router);
  private userService = inject(UserService);
  private responsiveService = inject(ResponsiveService);
  private dashboardService = inject(DashboardService);
  private cartService = inject(CartService);
  private auth = inject(AuthService);
  private orderService = inject(OrderService);
  private dataCache = inject(DataCacheService);

  // Mapeos de Estado Compartidos
  private statusTranslation: { [key: string]: string } = {
    'pending': 'Pendiente',
    'confirmated': 'Aprobado',
    'confirmed': 'Aprobado',
    'processing': 'En Proceso',
    'completed': 'Completado',
    'refunded': 'Reembolsado',
    'cancelled': 'Anulado',
    'canceled': 'Anulado',
    'failed': 'Anulado',
  };
  private statusOrder = ['Pendiente', 'Aprobado', 'En Proceso', 'Completado', 'Anulado', 'Reembolsado'];


  // ðŸ‘¤ SeÃ±ales para el usuario
  currentUser = signal<User | null>(null);
  userInitial = signal<string>('A');

  // Control de Vistas
  vistaActual = signal<Secciones>('dashboard');
  isBootstrapped = signal<boolean>(false);
  isSidebarOpen = signal<boolean>(false);

  // Datos dinÃ¡micos
  totalUsuarios = signal<number>(0);
  totalPaises = signal<number>(0);
  totalOrdenes = signal<number>(0);
  totalProductos = signal<number>(0);
  totalCategorias = signal<number>(0);
  totalMonedas = signal<number>(0);
  pendientes = signal<number>(0);
  totalPagos = signal<number>(0);


  usuarioSeleccionadoForOrders = signal<string | null>(null);
  clienteSeleccionadoFilter = signal<{ firstName: string, lastName: string } | null>(null);


  // AnalÃ­ticas extendidas
  ingresosPorMoneda = signal<{ moneda: string; total: number }[]>([]);
  promedioPorMoneda = signal<{ moneda: string; total: number }[]>([]);

  // Tabla Comparativa (Filas = MÃ©todos, Columnas = Estados)
  comparativeTable = signal<StatusMethodRow[]>([]);
  statusList = signal<string[]>([]);
  comparativeFooters = signal<{ [key: string]: number }>({});
  comparativeGrandTotal = signal<number>(0);
  totalHistoricoRecargas = signal<number>(0);

  // Estados de carga (para evitar el "Cargando..." perpetuo)
  ingresosCargados = signal<boolean>(false);
  promedioCargado = signal<boolean>(false);


  // Opciones de Graficas
  @ViewChildren('dynamicChart') chartCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChild('comparativeChart') comparativeChartCanvas?: ElementRef<HTMLCanvasElement>;
  charts: Chart[] = [];
  comparativeChartInstance: Chart | null = null;

  // â”€â”€ AuditorÃ­a de Soporte (restaurado de commit funcional 84131e6) â”€â”€
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterDashboardUserId = signal<string>('');
  filterDashboardPeriod = signal<string>('');
  adminFilterUsers = signal<User[]>([]);
  auditOrders = signal<Order[]>([]);
  auditTotalOrders = signal<number>(0);
  auditAmountsByCurrency = signal<{ symbol: string; amount: number }[]>([]);
  auditCancelledByCurrency = signal<{ symbol: string; amount: number }[]>([]);
  auditLoading = signal<boolean>(false);
  // Paginación de Auditoría
  auditCurrentPage = signal<number>(1);
  auditPageSize = signal<number>(10);
  auditTotalPages = signal<number>(1);
  private allFilteredAuditOrders: Order[] = []; // Cache para paginar localmente
  private dashboardReloadTimer: ReturnType<typeof setTimeout> | null = null;
  private dashboardLoadedOnce = false;



  ngOnInit() {
    if (this.responsiveService.isBrowser) {
      this.loadUserData();
      return;
    }
    // Evita prerenderizar dashboard en SSR para no mostrar un frame inicial incorrecto
    this.isBootstrapped.set(false);
  }

  private loadUserData() {
    this.userService.getMe().subscribe({
      next: (res) => {
        if (res.success && res.value) {
          this.currentUser.set(res.value);
          this.userInitial.set(res.value.firstName ? res.value.firstName.charAt(0).toUpperCase() : 'A');
          const savedSection = this.getSavedSection();
          const initialSection = this.getInitialSectionForRole(res.value.role, savedSection);
          this.vistaActual.set(initialSection);

          if (this.isSupportRole(res.value.role)) {
            this.filterDashboardUserId.set(res.value.id || '');
          }

          this.isBootstrapped.set(true);

          // Solo cargamos reportes si realmente inicia en dashboard
          if (initialSection === 'dashboard') {
            this.loadDashboardData();
          }
          return;
        }

        this.router.navigate(['/']);
      },
      error: () => {
        this.router.navigate(['/']);
      }
    });
  }

  private loadDashboardData() {
    if (!this.isSupportUser()) {
      this.loadDashboardSummary();
      this.loadAdminFilterUsers();
    }

    this.loadAnalytics();
    this.loadAdvancedAnalytics();
    this.dashboardLoadedOnce = true;
  }


  private injectFilters(query: ReportQuery): ReportQuery {
    const filters = [...(query.filters || [])];
    const selectedUserId = (this.filterDashboardUserId() || '').toString().trim();
    const selectedStartDate = this.filterStartDate();
    const selectedEndDate = this.filterEndDate();
    const selectedPeriod = this.filterDashboardPeriod();

    if (selectedUserId) {
      filters.push({
        field: this.getSupportUserFilterField(query.entity),
        operator: 0,
        value: selectedUserId
      });
    }

    return {
      ...query,
      period: selectedPeriod || query.period,
      startDate: selectedStartDate || undefined,
      endDate: selectedEndDate || undefined,
      filters
    };
  }

  private getSupportUserFilterField(entity: string): string {
    return entity === 'OrderDetails' ? 'PurchaseOrder_UserAdminID' : 'UserAdminID';
  }

  private getDateFieldForEntity(entity: string): string {
    return entity === 'OrderDetails' ? 'PaymentDate' : 'CreatedAt';
  }

  private loadDashboardSummary() {
    this.dashboardService.getSummary().subscribe({
      next: (res) => {
        if (res.success && res.value) {
          const totals = res.value.totals;
          this.totalUsuarios.set(totals['Users'] || 0);
          this.totalPaises.set(totals['Countries'] || 0);
          this.totalOrdenes.set(totals['Orders'] || 0);
          this.totalProductos.set(totals['Products'] || 0);
          this.totalCategorias.set(totals['Categories'] || 0);
          this.totalMonedas.set(totals['Coins'] || 0);
          this.pendientes.set(totals['Details'] || 0);
          this.totalPagos.set(totals['Payments'] || 0);
        }
      }
    });
  }

  private extractArray(resValue: any): any[] {
    if (!resValue) return [];
    if (Array.isArray(resValue)) return resValue;
    if (resValue.data && Array.isArray(resValue.data)) return resValue.data;
    if (resValue.items && Array.isArray(resValue.items)) return resValue.items;

    // Si el backend retornÃ³ un objeto / diccionario en lugar de un arreglo
    if (typeof resValue === 'object') {
      const arr: any[] = [];
      for (const [k, v] of Object.entries(resValue)) {
        if (typeof v === 'number') {
          // Asumimos que la llave es el grupo/serie y el valor numÃ©rico es la agregaciÃ³n
          arr.push({ group: k, series: k, value: v });
        } else if (typeof v === 'object' && v !== null) {
          arr.push({ group: k, ...v, series: k });
        }
      }
      return arr;
    }
    return [resValue];
  }

  private loadAnalytics() {
    // 1. Ingresos Completados/Aprobados por Moneda
    this.dashboardService.getReport(this.injectFilters({
      entity: "OrderDetails", aggregation: "Sum", valueField: "Price", seriesField: "Status", groupField: "Payment_Coin_Code", period: 0
    })).subscribe(res => {
      this.ingresosCargados.set(true);
      if (res.success && res.value) {
        const raw = res.value;
        const labels: string[] = raw.labels || [];
        const seriesData: { name: string; values: number[] }[] = raw.series || [];

        // Buscamos todas las series que representen un ingreso exitoso (Completado o Aprobado)
        const successStatuses = ['completed', 'completado', 'confirmed', 'confirmated', 'aprobado'];
        const validSeries = seriesData.filter(s => successStatuses.includes(s.name.toLowerCase().trim()));

        if (validSeries.length > 0 && labels.length > 0) {
          const result = labels.map((moneda: string, i: number) => {
            // Sumamos los valores de todas las series vÃ¡lidas para esta moneda
            const total = validSeries.reduce((acc, s) => acc + (s.values[i] || 0), 0);
            return { moneda, total };
          }).filter(item => item.total > 0);

          this.ingresosPorMoneda.set(result);
        } else {
          this.ingresosPorMoneda.set([]);
        }
      } else {
        this.ingresosPorMoneda.set([]);
      }
    });

    // 2. [ELIMINADO] - Conteo de Ã³rdenes (Ya se maneja en el Summary)

    // 3. Promedio por Ã“rdenes (Solo Ã³rdenes completadas)
    this.dashboardService.getReport(this.injectFilters({
      entity: "OrderDetails",
      aggregation: "Average",
      valueField: "Price",
      seriesField: "Status",
      groupField: "Payment_Coin_Code",
      period: 0
    })).subscribe(res => {
      this.promedioCargado.set(true);
      if (res.success && res.value) {
        const raw = res.value;
        const labels: string[] = raw.labels || [];
        const seriesData: { name: string; values: number[] }[] = raw.series || [];

        // Buscamos especÃ­ficamente la serie de Ã³rdenes 'Completed' o 'Completado'
        const completedSeries = seriesData.find(s =>
          ['completed', 'completado'].includes(s.name.toLowerCase().trim())
        );

        if (completedSeries && labels.length > 0) {
          const values = completedSeries.values || [];
          const result = labels.map((moneda: string, i: number) => {
            return { moneda, total: values[i] || 0 };
          }).filter(item => item.total > 0);

          this.promedioPorMoneda.set(result);
        } else {
          this.promedioPorMoneda.set([]);
        }
      } else {
        this.promedioPorMoneda.set([]);
      }
    });

    // 4. [ELIMINADO] - Ingresos por MÃ©todo de Pago (Balances) - No se utiliza en el front actual

    // 5. Comparativa MÃ©todo de Pago vs Estado (Filas = mÃ©todos, Columnas = estados)
    this.dashboardService.getReport(this.injectFilters({
      entity: "OrderDetails", aggregation: "Sum", valueField: "Price", seriesField: "Status", groupField: "Payment_Name", period: 0
    })).subscribe(res => {
      if (res.success && res.value) {
        const raw = res.value;

        const labels: string[] = raw.labels || [];
        const seriesData: { name: string; values: number[] }[] = raw.series || [];

        // Traducir nombres de serie
        const translatedSeries = seriesData.map((s: any) => ({
          ...s,
          name: this.statusTranslation[s.name.toLowerCase()] || s.name
        }));

        // Siempre mostrar todas las columnas del orden definido
        const allTranslatedNames = translatedSeries.map((s: any) => s.name);
        const orderedStatusNames = [...this.statusOrder];
        // Agregar cualquier status no contemplado al final
        allTranslatedNames.forEach((name: string) => {
          if (!orderedStatusNames.includes(name)) orderedStatusNames.push(name);
        });

        this.statusList.set(orderedStatusNames);

        const table: StatusMethodRow[] = [];
        const footers: { [s: string]: number } = {};
        let grand = 0;

        labels.forEach((methodName: string, i: number) => {
          const statuses: { [status: string]: number } = {};
          let rowTotal = 0;

          translatedSeries.forEach((serie: any) => {
            const val = serie.values[i] || 0;
            statuses[serie.name] = (statuses[serie.name] || 0) + val;
            rowTotal += val;
            footers[serie.name] = (footers[serie.name] || 0) + val;
          });

          grand += rowTotal;
          table.push({ methodName, statuses, total: rowTotal });
        });

        this.comparativeTable.set(table);
        this.comparativeFooters.set(footers);
        this.comparativeGrandTotal.set(grand);

        // EXTRA: Alimentamos tambiÃ©n la primera grÃ¡fica (Revenue) con estos mismos datos
        this.renderRevenueChartFromTable(raw);
      }
    });
  }

  private renderRevenueChartFromTable(raw: any) {
    const checkAndRender = (attempts: number) => {
      const canvases = this.chartCanvases?.toArray() || [];
      if (canvases.length === 0 && attempts > 0) {
        setTimeout(() => checkAndRender(attempts - 1), 200);
        return;
      }
      if (canvases[0]) {
        this.buildStatusMethodChart(canvases[0].nativeElement, 'Revenue por Estado y Metodo', raw, false, true);
      }
    };
    checkAndRender(10);
  }

  loadAdvancedAnalytics() {
    // Definimos las 3 consultas dinamicas restantes (Volumen, Tendencia, Ingresos Diarios)
    const queries: ReportQuery[] = [
      { entity: "OrderDetails", chartType: "Bar", aggregation: "Count", seriesField: "Status", groupField: "Payment_Name", period: 0 },
      { entity: "OrderDetails", chartType: "Area", aggregation: "Count", groupField: "PaymentDate", period: "Day" },
      { entity: "OrderDetails", chartType: "Area", aggregation: "Sum", valueField: "Price", seriesField: "Payment_Name", groupField: "PaymentDate", period: "Day" }
    ];

    const chartTitles = [
      'Volumen por Estado y Metodo',
      'Conteo de Recargas Diarias',
      'Ingresos Diarios por Metodo'
    ];

    // Limpiar charts previos si se recarga
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    // Renderizar esperando a que el DOM estÃ© listo (manejo Angular Signals)
    const checkAndRender = (attempts: number) => {
      const canvases = this.chartCanvases?.toArray() || [];
      if (canvases.length === 0 && attempts > 0) {
        setTimeout(() => checkAndRender(attempts - 1), 200);
        return;
      }

      queries.forEach((q, index) => {
        const targetCanvas = canvases[index + 1];
        if (!targetCanvas) return;

        const finalQ = this.injectFilters(q);
        this.dashboardService.getReport(finalQ).subscribe({
          next: (res) => {
            // index 0: Volumen (Stacked + Count) -> Canvas 1
            if (index === 0 && res.value && res.value.labels) {
              this.buildStatusMethodChart(targetCanvas.nativeElement, chartTitles[index], res.value, true, false);
              return;
            }

            // index 1: Tendencia (Area + Badge de total) -> Canvas 2
            if (index === 1) {
              this.buildTrendChart(targetCanvas.nativeElement, chartTitles[index], res.value || []);
              return;
            }

            // index 2: Tendencia Multi-serie (Area + Currency) -> Canvas 3
            if (index === 2) {
              if (res.value && res.value.labels) {
                this.buildMultiTrendChart(targetCanvas.nativeElement, chartTitles[index], res.value);
              }
              return;
            }

            this.buildChart(targetCanvas.nativeElement, chartTitles[index], q, res.value || []);
          },
          error: (err) => {
            this.buildChart(targetCanvas.nativeElement, chartTitles[index] + ' (Error de datos)', q, []);
          }
        });
      });
    };

    checkAndRender(10); // Reintentar hasta 10 veces (2 segundos)
  }

  private getDynamicValue(obj: any, fieldName: string | undefined): any {
    if (!obj || !fieldName) return undefined;

    // Si res= { "Zelle": 500 } y extractArray lo volviÃ³ { group: "Zelle", series: "Zelle", value: 500 }
    if (obj[fieldName] !== undefined) return obj[fieldName];

    const lowerField = fieldName.toLowerCase();
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === lowerField) return obj[key];
    }

    const aliases: { [key: string]: string[] } = {
      'group': [fieldName],
      'series': [fieldName],
      'value': ['price', 'monto', 'total', 'count', 'cantidad', fieldName]
    };

    if (aliases['value'].includes(lowerField)) {
      for (const k of aliases['value']) {
        const v = this.findIgnoreCase(obj, k);
        if (v !== undefined) return v;
      }
    }

    // Alias para group (e.g. si fieldName era FKDetail_Name y el backend devolviÃ³ el alias dinamico)
    if (lowerField === 'group' || lowerField === 'series') {
      // En multi-serie se necesita buscar cualquier posible property string
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'string' && isNaN(Number(obj[k]))) return obj[k];
      }
    }

    return undefined;
  }

  private findIgnoreCase(obj: any, key: string) {
    const lk = key.toLowerCase();
    for (const k in obj) {
      if (k.toLowerCase() === lk) return obj[k];
    }
    return undefined;
  }

  private formatChartLabel(raw: unknown): string {
    const text = String(raw ?? '').trim();
    if (!text) return 'N/A';

    const isoDatePrefix = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2})(?::(\d{2}))?(?::\d{2})?)?$/;
    const match = text.match(isoDatePrefix);
    if (!match) return text;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return text;

    const hasHour = match[4] !== undefined;
    const hour = hasHour ? Number(match[4]) : 0;
    const minute = match[5] !== undefined ? Number(match[5]) : 0;

    const d = new Date(year, month - 1, day, hour, minute);
    if (Number.isNaN(d.getTime())) return text;

    if (hasHour) {
      return d.toLocaleString('es', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }

    return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  }

  /**
   * GrÃ¡fica de tendencia: una sola serie tipo Area con colores mate.
   */
  private buildTrendChart(canvas: HTMLCanvasElement, title: string, data: any) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let labels: string[] = [];
    let values: number[] = [];

    if (data && data.labels && data.series) {
      const rawLabels = (data.labels as string[]);
      labels = rawLabels.map((raw: string) => this.formatChartLabel(raw));
      const seriesArr: { name: string; values: number[] }[] = data.series || [];
      values = rawLabels.map((_: string, i: number) => {
        return seriesArr.reduce((sum: number, s: any) => sum + (s.values[i] || 0), 0);
      });
    } else {
      const list = this.extractArray(data);
      labels = list.map((item: any) => this.formatChartLabel(this.getDynamicValue(item, 'group') || 'N/A'));
      values = list.map((item: any) => Number(this.getDynamicValue(item, 'value') || 0));
    }

    // Actualizar el conteo total para la UI
    const totalCount = values.reduce((acc, v) => acc + v, 0);
    this.totalHistoricoRecargas.set(totalCount);

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: title,
          data: values,
          backgroundColor: gradient,
          borderColor: 'rgba(99, 102, 241, 0.5)',
          borderWidth: 1.5,
          fill: true,
          tension: 0.45,
          pointBackgroundColor: '#0f1115',
          pointBorderColor: 'rgba(99, 102, 241, 0.4)',
          pointBorderWidth: 1.5,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: 'rgba(99, 102, 241, 0.8)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(6, 7, 8, 0.9)',
            callbacks: {
              label: (ctx: any) => `${ctx.parsed.y} recargas`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#64748b' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45 }
          }
        }
      }
    } as any);

    this.charts.push(chart);
  }

  /**
   * GrÃ¡fica especializada: Tendencia multi-serie (Ãrea Mate + Moneda)
   * Eje X: Fecha, Leyenda: MÃ©todo de Pago
   * 
   * IMPORTANTE: Esta funciÃ³n maneja DOS escenarios posibles del backend:
   *   A) series[].name = nombre de mÃ©todo de pago â†’ consolida directamente
   *   B) series[].name = nombre de estado (Completed, Pending) â†’ suma todos los estados en una sola lÃ­nea
   */
  private buildMultiTrendChart(canvas: HTMLCanvasElement, title: string, raw: any) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rawLabels: string[] = raw.labels || [];
    const seriesArr: { name: string; values: number[] }[] = raw.series || [];

    // Formatear las fechas para el eje X
    const labels = rawLabels.map(raw => this.formatChartLabel(raw));

    const labelCount = labels.length;

    // Detectar si las series son estados. Si TODAS las series tienen nombres
    // que coinciden con estados conocidos, el backend no respetÃ³ Payment_Name
    // y devolviÃ³ Status como serie. En ese caso sumamos todo en una sola lÃ­nea.
    const knownStatuses = ['completed', 'pending', 'confirmated', 'confirmed', 'processing',
      'refunded', 'cancelled', 'canceled', 'failed',
      'completado', 'pendiente', 'aprobado', 'en proceso', 'anulado', 'reembolsado'];

    const seriesAreStatuses = seriesArr.length > 0 && seriesArr.every(s =>
      knownStatuses.includes(s.name.toLowerCase().trim())
    );

    let consolidatedMap: Map<string, number[]>;

    if (seriesAreStatuses) {
      // CASO B: El backend devolviÃ³ estados como series.
      // Sumamos TODOS los valores de todas las series (estados) en una sola lÃ­nea "Total Ingresos"
      // Ya que no tenemos el desglose por mÃ©todo, mostramos una lÃ­nea consolidada.
      console.log('[Chart 3] Backend devolviÃ³ estados como series. Consolidando en una sola lÃ­nea.');
      consolidatedMap = new Map<string, number[]>();
      const totalValues = new Array(labelCount).fill(0);

      seriesArr.forEach(s => {
        const vals = s.values || [];
        vals.forEach((v, i) => {
          if (i < labelCount) {
            totalValues[i] += (v || 0);
          }
        });
      });

      consolidatedMap.set('Total Ingresos', totalValues);
    } else {
      // CASO A: El backend devolviÃ³ "Status - MÃ©todo" como nombre de serie.
      // Extraemos el MÃ‰TODO (parte derecha): "Completed - Zelle" â†’ "Zelle"
      console.log('[Chart 3] Agrupando por mÃ©todo de pago (parte derecha del nombre de serie).');
      consolidatedMap = new Map<string, number[]>();

      seriesArr.forEach(s => {
        const parts = s.name.split(' - ');
        // El mÃ©todo de pago es la parte DESPUÃ‰S del guiÃ³n (index 1+)
        const name = parts.length > 1 ? parts.slice(1).join(' - ').trim() : s.name.trim();

        const vals = s.values || [];
        if (!consolidatedMap.has(name)) {
          consolidatedMap.set(name, new Array(labelCount).fill(0));
        }

        const existing = consolidatedMap.get(name)!;
        vals.forEach((v, i) => {
          if (i < labelCount) {
            existing[i] += (v || 0);
          }
        });
      });
    }

    // Construir datasets para Chart.js
    const methodColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
    const datasets = Array.from(consolidatedMap.entries()).map(([name, values], sIdx) => {
      const color = methodColors[sIdx % methodColors.length];
      const gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, color + '44');
      gradient.addColorStop(1, color + '05');

      return {
        label: name,
        data: values,
        backgroundColor: gradient,
        borderColor: color,
        borderWidth: 2,
        fill: true,
        tension: 0.45,
        pointBackgroundColor: '#0f1115',
        pointBorderColor: color,
        pointRadius: 2,
        pointHoverRadius: 5
      };
    });

    const chart = new Chart(canvas, {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#94a3b8', font: { size: 10 } } },
          tooltip: {
            backgroundColor: 'rgba(6, 7, 8, 0.9)',
            callbacks: {
              label: (ctx: any) => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#64748b', callback: (val: any) => `$${val.toLocaleString()}` }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#64748b',
              font: { size: 10 },
              maxRotation: 45,
              autoSkip: false
            }
          }
        }
      }
    } as any);

    this.charts.push(chart);
  }

  /**
   * GrÃ¡fica especializada: Estado (eje X) agrupado por MÃ©todo de Pago (datasets/leyenda).
   */
  private buildStatusMethodChart(canvas: HTMLCanvasElement, title: string, raw: any, stacked: boolean = false, isCurrency: boolean = false) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const paymentMethods: string[] = raw.labels || [];
    const statusSeries: { name: string; values: number[] }[] = raw.series || [];

    const methodColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

    const translatedStatusMap: { backendIdx: number; name: string }[] = [];
    statusSeries.forEach((s, idx) => {
      const translated = this.statusTranslation[s.name.toLowerCase()] || s.name;
      translatedStatusMap.push({ backendIdx: idx, name: translated });
    });

    const orderedLabels = [...this.statusOrder];

    const datasets = paymentMethods.map((method, mIdx) => {
      const color = methodColors[mIdx % methodColors.length];
      const data = orderedLabels.map(statusName => {
        let total = 0;
        translatedStatusMap.forEach(entry => {
          if (entry.name === statusName) {
            total += (statusSeries[entry.backendIdx].values[mIdx] || 0);
          }
        });
        return total;
      });

      const gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '66');

      return {
        label: method,
        data: data,
        backgroundColor: gradient,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 5,
        borderSkipped: false,
        stack: stacked ? 'total' : undefined,
        barPercentage: 0.8,
        categoryPercentage: 0.7
      };
    });

    const chart = new Chart(canvas, {
      type: 'bar',
      data: { labels: orderedLabels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#94a3b8', font: { size: 10 } } },
          tooltip: {
            backgroundColor: 'rgba(6, 7, 8, 0.9)',
            callbacks: {
              label: (ctx: any) => `${ctx.dataset.label}: ${isCurrency ? '$' : ''}${ctx.parsed.y}`
            }
          }
        },
        scales: {
          y: {
            stacked: stacked,
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#64748b', callback: (val: any) => isCurrency ? `$${val}` : val }
          },
          x: {
            stacked: stacked,
            grid: { display: false },
            ticks: { color: '#64748b' }
          }
        }
      }
    } as any);

    this.charts.push(chart);
  }

  private buildChart(canvas: HTMLCanvasElement, title: string, query: ReportQuery, data: any) {
    const list = this.extractArray(data);
    let labels: string[] = [];
    let datasets: any[] = [];

    let visualChartType = query.chartType?.toLowerCase() || 'bar';
    let isArea = false;
    if (visualChartType === 'area') {
      visualChartType = 'line';
      isArea = true;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Colores Premium
    const rootColors = ['#00d4ff', '#00ff95', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ff007f'];

    if (query.seriesField || (list.length > 0 && typeof list[0] === 'object' && Object.keys(list[0]).length > 2)) {
      // Manejo de multi-series
      const seriesMap = new Map<string, Map<string, number>>();
      const groupSet = new Set<string>();

      list.forEach((item: any) => {
        const defGrp = this.getDynamicValue(item, 'group') || 'N/A';
        const defSer = this.getDynamicValue(item, 'series') || 'Series';
        const defVal = this.getDynamicValue(item, 'value') || 0;

        const grp = String(this.getDynamicValue(item, query.groupField) || defGrp);
        const ser = String(this.getDynamicValue(item, query.seriesField) || defSer);
        const val = Number(this.getDynamicValue(item, query.valueField) || defVal);

        groupSet.add(grp);
        if (!seriesMap.has(ser)) {
          seriesMap.set(ser, new Map());
        }
        seriesMap.get(ser)!.set(grp, val);
      });

      labels = Array.from(groupSet);
      labels.sort();

      let colorIdx = 0;

      for (const [serieName, dataMap] of seriesMap.entries()) {
        const dataArr = labels.map(l => dataMap.get(l) || 0);
        const baseColor = rootColors[colorIdx % rootColors.length];

        let backgroundColor: any = baseColor + '44';
        if (visualChartType === 'bar' || isArea) {
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
          gradient.addColorStop(0, baseColor + (isArea ? '88' : 'cc'));
          gradient.addColorStop(1, baseColor + '11');
          backgroundColor = gradient;
        }

        datasets.push({
          label: serieName,
          data: dataArr,
          backgroundColor: backgroundColor,
          borderColor: baseColor,
          borderWidth: visualChartType === 'bar' ? 1 : 2,
          fill: isArea,
          tension: 0.4,
          borderRadius: visualChartType === 'bar' ? 6 : 0,
          pointBackgroundColor: '#0f1115',
          pointBorderColor: baseColor,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: baseColor,
        });
        colorIdx++;
      }
    } else {
      // Manejo single-series
      labels = list.map((item: any) => {
        const defGrp = this.getDynamicValue(item, 'group') || 'N/A';
        return String(this.getDynamicValue(item, query.groupField) || defGrp);
      });
      const dataArr = list.map((item: any) => {
        const defVal = this.getDynamicValue(item, 'value') || 0;
        return Number(this.getDynamicValue(item, query.valueField) || defVal);
      });

      // Asignar mÃºltiples colores si es Doughnut/Pie, sino un solo color
      let bgColors: any = rootColors[0] + '88';
      let borderColors: string | string[] = rootColors[0];

      if (visualChartType === 'doughnut' || visualChartType === 'pie') {
        bgColors = labels.map((_, i) => rootColors[i % rootColors.length]);
        borderColors = '#0f1115';
      } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
        gradient.addColorStop(0, rootColors[0] + (isArea ? '88' : 'cc'));
        gradient.addColorStop(1, rootColors[0] + '11');
        bgColors = gradient;
      }

      datasets.push({
        label: title,
        data: dataArr,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: visualChartType === 'bar' ? 1 : 2,
        fill: isArea,
        borderRadius: visualChartType === 'bar' ? 6 : 0,
        tension: 0.4,
        pointBackgroundColor: '#0f1115',
        pointBorderColor: rootColors[0],
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: rootColors[0],
      });
    }

    // Glowing border effects plugin (custom)
    const glowPlugin = {
      id: 'glow',
      beforeDraw: (chart: Chart) => {
        if ((chart.config as any).type !== 'line') return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.shadowColor = chart.data.datasets[0].borderColor as string;
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
      },
      afterDraw: (chart: Chart) => {
        chart.ctx.restore();
      }
    };

    const chart = new Chart(canvas, ({
      type: visualChartType as any,
      data: {
        labels: labels,
        datasets: datasets
      },
      plugins: [glowPlugin as any],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: visualChartType !== 'bar' || datasets.length > 1,
            position: 'top',
            labels: { color: '#cbd5e1', font: { family: "'Plus Jakarta Sans', sans-serif" }, usePointStyle: true, boxWidth: 8 }
          },
          tooltip: {
            backgroundColor: 'rgba(6, 7, 8, 0.9)',
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(0, 212, 255, 0.3)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 'bold' },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
          }
        },
        scales: (visualChartType === 'doughnut' || visualChartType === 'pie') ? undefined : {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.03)' },
            ticks: { color: '#64748b', font: { family: "'Plus Jakarta Sans', sans-serif" } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { family: "'Plus Jakarta Sans', sans-serif" } }
          }
        }
      }
    } as any));

    this.charts.push(chart);
  }

  statusCssClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // â”€â”€â”€â”€ AUDITORÃA DE SOPORTE (restaurado de commit funcional 84131e6) â”€â”€â”€â”€
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  loadAdminFilterUsers() {
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
        this.adminFilterUsers.set(mapped.filter(u => (u.role || '').toLowerCase() !== 'user'));
      },
      error: () => this.adminFilterUsers.set([])
    });
  }

  onUserFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterDashboardUserId.set(select.value);
    this.scheduleDashboardReload();
    this.loadSupportAudit();
  }

  onAuditStartDateChange(val: string) {
    this.filterStartDate.set(val);
    this.scheduleDashboardReload();
    if (this.filterDashboardUserId()) this.loadSupportAudit();
  }

  onAuditEndDateChange(val: string) {
    this.filterEndDate.set(val);
    this.scheduleDashboardReload();
    if (this.filterDashboardUserId()) this.loadSupportAudit();
  }

  onDashboardPeriodChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterDashboardPeriod.set(select.value);
    this.scheduleDashboardReload();
  }

  private scheduleDashboardReload() {
    if (this.dashboardReloadTimer) {
      clearTimeout(this.dashboardReloadTimer);
    }

    this.dashboardReloadTimer = setTimeout(() => {
      this.reloadDashboardReports();
      this.dashboardReloadTimer = null;
    }, 350);
  }

  private reloadDashboardReports() {
    this.ingresosCargados.set(false);
    this.promedioCargado.set(false);
    this.loadAnalytics();
    this.loadAdvancedAnalytics();
  }

  clearAuditFilters() {
    this.filterStartDate.set('');
    this.filterEndDate.set('');
    if (this.isSupportUser()) {
      this.filterDashboardUserId.set(this.currentUser()?.id || '');
    } else {
      this.filterDashboardUserId.set('');
    }
    this.filterDashboardPeriod.set('');
    this.reloadDashboardReports();
    if (!this.isSupportUser()) {
      this.loadSupportAudit();
    }
  }

  isSupportUser(): boolean {
    return this.isSupportRole(this.currentUser()?.role);
  }

  // --- LÃ“GICA DE AUDITORÃA DE SOPORTE ---
  loadSupportAudit() {
    const userId = this.filterDashboardUserId();
    if (!userId) {
      this.auditOrders.set([]);
      this.auditTotalOrders.set(0);
      this.auditAmountsByCurrency.set([]);
      this.auditCancelledByCurrency.set([]);
      this.auditCurrentPage.set(1);
      return;
    }

    this.auditLoading.set(true);

    const searchCriteria: any = {
      pageNumber: 1,
      pageSize: 100,
      select: [
        'Id',
        'UserAdminID',
        'Description',
        'CreatedAt',
        'OrderDetails_Price',
        'OrderDetails_Status',
        'OrderDetails_PaymentDate',
        'OrderDetails_PaymentID'
      ]
    };
    // Asegurar que los datos de monedas esten cargados antes de mapear
    this.dataCache.ensureDataLoaded().subscribe(() => {
    // Primera petición para obtener totalPages
    this.orderService.search(searchCriteria).subscribe({
      next: (res) => {
        if (!res?.success || !res.value) {
          this.auditLoading.set(false);
          this.auditOrders.set([]);
          this.calculateAuditTotals([]);
          return;
        }

        const initialItems = res.value.items || res.value || [];
        const totalPages = res.value.totalPages || 1;

        const allMapped = this.mapAuditOrders(initialItems);

        if (totalPages <= 1) {
          this.applyLocalAuditFilter(allMapped, userId);
          return;
        }

        // Obtener el resto de pÃ¡ginas
        const remaining: Observable<any>[] = [];
        for (let p = 2; p <= totalPages; p++) {
          remaining.push(this.orderService.search({ ...searchCriteria, pageNumber: p }));
        }

        forkJoin(remaining).subscribe({
          next: (responses) => {
            responses.forEach(r => {
              if (r?.success && r.value) {
                const items = r.value.items || r.value || [];
                allMapped.push(...this.mapAuditOrders(items));
              }
            });
            this.applyLocalAuditFilter(allMapped, userId);
          },
          error: () => this.applyLocalAuditFilter(allMapped, userId)
        });
      },
      error: () => {
        this.auditLoading.set(false);
        this.auditOrders.set([]);
        this.calculateAuditTotals([]);
      }
    });
    }); // ensureDataLoaded
  }

  private applyLocalAuditFilter(allMapped: Order[], userId: string) {
    let filtered = allMapped.filter(order => order.userAdminID === userId);

    if (this.filterStartDate()) {
      const start = new Date(`${this.filterStartDate()}T00:00:00`);
      filtered = filtered.filter(o => o.createdAt && new Date(o.createdAt) >= start);
    }

    if (this.filterEndDate()) {
      const end = new Date(`${this.filterEndDate()}T23:59:59`);
      filtered = filtered.filter(o => o.createdAt && new Date(o.createdAt) <= end);
    }

    this.calculateAuditTotals(filtered);
    this.auditLoading.set(false);
  }

  private calculateAuditTotals(mapped: Order[]) {
    const validStatuses = [1, 2, 3, 4, 5];
    const filteredMapped = mapped.filter(o => {
      const st = Number(o.status);
      return validStatuses.includes(st);
    });

    // Guardar todos los registros para paginación local
    this.allFilteredAuditOrders = filteredMapped;
    this.auditTotalOrders.set(filteredMapped.length);

    // Calcular montos agrupados por moneda (usando desglose por orden)
    const processedMap = new Map<string, number>();
    const cancelledMap = new Map<string, number>();
    filteredMapped.forEach(o => {
      const st = Number(o.status);
      const totals = o.currencyTotals || [{ symbol: o.currencySymbol || '$', amount: o.total || 0 }];
      totals.forEach((ct: { symbol: string; amount: number }) => {
        if (st === 4 || st === 5) {
          cancelledMap.set(ct.symbol, (cancelledMap.get(ct.symbol) || 0) + ct.amount);
        } else {
          processedMap.set(ct.symbol, (processedMap.get(ct.symbol) || 0) + ct.amount);
        }
      });
    });
    // Ordenar por monto: la moneda con más ventas primero
    const sortCurrency = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount;
    this.auditAmountsByCurrency.set(
      Array.from(processedMap.entries()).map(([symbol, amount]) => ({ symbol, amount })).sort(sortCurrency)
    );
    this.auditCancelledByCurrency.set(
      Array.from(cancelledMap.entries()).map(([symbol, amount]) => ({ symbol, amount })).sort(sortCurrency)
    );

    // Calcular total de paginas y mostrar la página actual
    const pageSize = this.auditPageSize();
    const totalPages = Math.max(1, Math.ceil(filteredMapped.length / pageSize));
    this.auditTotalPages.set(totalPages);
    this.applyAuditPage();
    this.auditLoading.set(false);
  }

  private applyAuditPage() {
    const page = this.auditCurrentPage();
    const size = this.auditPageSize();
    const start = (page - 1) * size;
    this.auditOrders.set(this.allFilteredAuditOrders.slice(start, start + size));
  }

  goToAuditPage(page: number) {
    const total = this.auditTotalPages();
    if (page < 1 || page > total) return;
    this.auditCurrentPage.set(page);
    this.applyAuditPage();
  }

  prevAuditPage() { this.goToAuditPage(this.auditCurrentPage() - 1); }
  nextAuditPage() { this.goToAuditPage(this.auditCurrentPage() + 1); }

  auditPageNumbers(): number[] {
    const total = this.auditTotalPages();
    const current = this.auditCurrentPage();
    const pages: number[] = [];
    const range = 2; // paginas a mostrar a cada lado
    for (let i = Math.max(1, current - range); i <= Math.min(total, current + range); i++) {
      pages.push(i);
    }
    return pages;
  }

  private extractDateString(val: any): string | undefined {
    if (!val) return undefined;
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item === 'string') return item;
      }
      return undefined;
    }
    return String(val);
  }

  private mapAuditOrders(items: any[]): Order[] {
    return items.map(item => {
      let orderStatus = item.Status || 0;

      // Parsear arrays del backend
      let prices = item.OrderDetails_Price;
      if (typeof prices === 'string') prices = prices.split(',').map((p: string) => parseFloat(p));
      if (!Array.isArray(prices)) prices = prices ? [parseFloat(prices) || 0] : [];

      let paymentIds = item.OrderDetails_PaymentID;
      if (!Array.isArray(paymentIds)) paymentIds = paymentIds ? [paymentIds] : [];

      if (item.OrderDetails_Status) {
        let statuses = item.OrderDetails_Status;
        if (typeof statuses === 'string') statuses = statuses.split(',').map((s: string) => parseInt(s, 10));
        if (Array.isArray(statuses) && statuses.length > 0) orderStatus = statuses[0];
        else if (typeof statuses === 'number') orderStatus = statuses;
      }

      // Agrupar montos por moneda
      const currencyMap = new Map<string, number>();
      for (let i = 0; i < prices.length; i++) {
        const price = parseFloat(prices[i]) || 0;
        const pId = paymentIds[i] || paymentIds[0];
        const symbol = pId ? this.dataCache.getSymbolByPaymentId(pId) : '$';
        currencyMap.set(symbol, (currencyMap.get(symbol) || 0) + price);
      }
      const currencyTotals = Array.from(currencyMap.entries())
        .map(([symbol, amount]) => ({ symbol, amount }))
        .sort((a, b) => b.amount - a.amount);

      const createdDate = this.extractDateString(item.CreatedAt) ||
        this.extractDateString(item.createdAt);

      // Prioridad: UserAdminID del backend (seteado por token/sesión) es la fuente confiable.
      // Solo usamos el tag [ADMIN:uuid] del Description como fallback si UserAdminID es null.
      let adminId = item.UserAdminID || null;
      if (!adminId) {
        const desc = item.Description || item.description || '';
        const adminMatch = desc.match(/\[ADMIN:([a-f0-9-]+)\]/i);
        if (adminMatch && adminMatch[1]) {
          adminId = adminMatch[1];
        }
      }

      return {
        id: item.Id || item.id,
        userID: item.UserID || item.userId,
        userAdminID: adminId,
        createdAt: createdDate,
        total: currencyTotals.reduce((s, c) => s + c.amount, 0),
        status: orderStatus,
        currencySymbol: currencyTotals.length > 0 ? currencyTotals[0].symbol : '$',
        currencyTotals: currencyTotals
      };
    });
  }

  statusLabel(status: string | number | undefined): string {
    if (status === undefined) return 'Desconocido';
    const s = String(status);
    switch (s) {
      case '0': return 'Pendiente';
      case '1': return 'Aprobado';
      case '2': return 'Procesando';
      case '3': return 'Completado';
      case '4': return 'Reembolso';
      case '5': return 'Cancelado';
      default: return 'Desconocido';
    }
  }

  getSeccionTitle(): string {
    const titulos: { [key in Secciones]: string } = {
      dashboard: 'Panel de control',
      clientes: 'Gestion de clientes',
      recargas: 'Solicitudes de recarga',
      productos: 'Catalogo de productos',
      monedas: 'Gestion de monedas',
      paises: 'Configuracion de paises',
      categorias: 'Categorias de productos',
      pagos: 'Metodos de pago',
      precios: 'Lista de precios',
      cupones: 'Cupones',
      ordenes: 'Historial de ordenes',
      perfil: 'Mi perfil',
      configuracion: 'Configuracion del sistema'
    };
    return titulos[this.vistaActual()] || 'Administracion';
  }
  cambiarVista(vista: Secciones) {
    const targetView = this.canAccessSection(vista) ? vista : 'dashboard';

    if (targetView !== 'ordenes') {
      this.usuarioSeleccionadoForOrders.set(null);
    }
    if (targetView !== 'clientes') {
      this.clienteSeleccionadoFilter.set(null);
    }

    this.vistaActual.set(targetView);
    this.saveSection(targetView);
    this.isSidebarOpen.set(false); // Siempre cerrar sidebar al navegar

    if (targetView === 'dashboard') {
      if (!this.dashboardLoadedOnce) {
        this.loadDashboardData();
      } else {
        // Re-render/cargar dashboard cuando el usuario vuelve explícitamente al módulo
        this.reloadDashboardReports();
      }
    }
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  verOrdenesDeUsuario(userId: string) {
    this.usuarioSeleccionadoForOrders.set(userId);
    this.cambiarVista('ordenes');
    this.isSidebarOpen.set(false);
  }

  verClienteDesdeOrden(client: { firstName: string, lastName: string }) {
    this.clienteSeleccionadoFilter.set(client);
    this.cambiarVista('clientes');
    this.isSidebarOpen.set(false);
  }

  logout() {
    this.router.navigate(['/']);
  }

  private saveSection(section: Secciones) {
    if (!this.responsiveService.isBrowser) return;
    localStorage.setItem(this.adminSectionStorageKey, section);
  }

  private getInitialSectionForRole(role: string | undefined, savedSection: Secciones | null): Secciones {
    const section = savedSection || 'dashboard';
    if (this.canRoleAccessSection(role, section)) {
      return section;
    }

    this.saveSection('dashboard');
    return 'dashboard';
  }

  private getSavedSection(): Secciones | null {
    if (!this.responsiveService.isBrowser) return null;
    const raw = localStorage.getItem(this.adminSectionStorageKey);
    if (!raw) return null;
    return this.validSections.includes(raw as Secciones) ? (raw as Secciones) : null;
  }

  private canAccessSection(section: Secciones): boolean {
    return this.canRoleAccessSection(this.currentUser()?.role, section);
  }

  private canRoleAccessSection(role: string | undefined, section: Secciones): boolean {
    return !this.isSupportRole(role) || this.supportSections.has(section);
  }

  private isSupportRole(role: string | undefined): boolean {
    return (role || '').toLowerCase() === 'support';
  }
}
