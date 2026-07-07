import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- IMPORTANTE PARA EL MODAL INTEGRADO
import { PaymentService, Payment, PaymentData, mapPaymentApiItem, mapPaymentDataApiItem } from '../../../entities/payment';
import { CoinService, Coin } from '../../../entities/coin';
import { NotificationService } from '../../../shared/ui/toast/notification.service';
import { PaymentFormModalComponent } from '../../../features/payment/payment-form-modal/payment-form-modal';
import { ResponsiveService } from '../../../core/platform/responsive.service';

@Component({
  selector: 'app-payment-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentFormModalComponent],
  templateUrl: './payment-manager.html',
  styleUrl: './payment-manager.css' 
})
export class PaymentManagerComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private coinService = inject(CoinService);
  private notify = inject(NotificationService);
  private responsiveService = inject(ResponsiveService);
  
  // Señales CRUD Pagos
  payments = signal<Payment[]>([]);
  coins = signal<Coin[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  selectedPayment = signal<Payment | null>(null);

  // Señales CRUD Datos Dinámicos
  showDataModal = signal<boolean>(false);
  paymentDataList = signal<PaymentData[]>([]);
  loadingDataModal = signal<boolean>(false);

  // Señales y estado para el Modal de Confirmación
  showConfirmModal = signal<boolean>(false);
  confirmMessage = signal<string>('');
  private confirmAction: (() => void) | null = null;

  totalItems = signal<number>(0);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);

  pageSize = signal<number>(10);
  ascending = signal<boolean>(false);

  // Expansión de descripciones
  expandedItems = signal<number[]>([]);

  ngOnInit() {
    this.updatePageSize(false);
    if (this.responsiveService.isBrowser) {
      this.loadCoins(); 
      this.loadPayments();
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
      if (reload) this.loadPayments();
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
      this.loadPayments();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadPayments();
    }
  }

  // --- LÓGICA DE PAGOS BASE ---
  loadPayments() {
    this.loading.set(true);
    this.paymentService.search(this.currentPage(), this.pageSize()).subscribe({
      next: (res) => { 
        if (res.success && res.value) {
          // Mapeamos de Mayúsculas (C#) a Minúsculas (Angular)
          const pagosMapeados: Payment[] = (res.value.items as any[]).map(mapPaymentApiItem);

          this.payments.set(pagosMapeados);
          this.totalItems.set(res.value.totalItems);
          this.totalPages.set(res.value.totalPages);
        } else {
          this.payments.set([]);
        }
        this.loading.set(false); 
      },
      error: () => this.loading.set(false)
    });
  }

  loadCoins() {
    this.loading.set(true);
    
    
    this.coinService.search({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (response) => {
        if (response?.success && response.value) {
          const monedasMapeadas: Coin[] = (response.value.items as any[]).map((item: any) => ({ id: item.Id, name: item.Name, code: item.Code, symbol: item.Symbol }));
          this.coins.set(monedasMapeadas);
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

  openModal(payment: Payment | null = null) {
    this.selectedPayment.set(payment);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedPayment.set(null);
  }

  onSaveSuccess() {
    this.closeModal();
    this.loadPayments();
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

  executeConfirm() {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.closeConfirm();
  }

  deletePayment(id: number | undefined) {
    if (!id) return;
    this.openConfirm('¿Estás seguro de eliminar este método de pago?', () => {
      this.paymentService.delete(id).subscribe(() => { this.loadPayments(); });
    });
  }

  getCoinName(coinID: number): string {
    const coin = this.coins().find(c => c.id === coinID);
    return coin ? coin.name : `ID: ${coinID}`;
  }

  // --- LÓGICA DE DATOS DINÁMICOS (CAMPOS) ---
  openDataModal(payment: Payment) {
    this.selectedPayment.set(payment);
    this.loadingDataModal.set(true);
    
    // Obtener los campos específicos de este Payment (filtrados desde el servidor)
    this.paymentService.searchData(payment.id!).subscribe({
      next: (res) => {
        if (res && res.success && res.value && res.value.items && res.value.items.length > 0) {
          const dataForThisPayment = (res.value.items as any[]).map(mapPaymentDataApiItem);
          this.paymentDataList.set(dataForThisPayment);
        } else {
          // Si no hay ítems o algo falló en success, inicializamos vacío
          this.paymentDataList.set([]);
        }
        this.loadingDataModal.set(false);
        this.showDataModal.set(true);
      },
      error: (err) => {
        console.warn('Busqueda de campos devolvió sin resultados o error:', err);
        // Aún así abrimos el modal en blanco para poder agregar por primera vez
        this.loadingDataModal.set(false);
        this.paymentDataList.set([]);
        this.showDataModal.set(true);
      }
    });
  }

  closeDataModal() {
    this.showDataModal.set(false);
    this.selectedPayment.set(null);
    this.paymentDataList.set([]);
  }

  addDataRow() {
    const currentList = this.paymentDataList();
    this.paymentDataList.set([
      ...currentList, 
      { paymentID: this.selectedPayment()!.id!, key: '', valueType: 'text', value: '' }
    ]);
  }

  onFileSelected(event: any, item: PaymentData) {
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
        // Asignamos la cadena base64 completa al valor
        item.value = e.target.result; 
        
        // Forzamos actualización de la señal para que Angular detecte el cambio
        this.paymentDataList.set([...this.paymentDataList()]);
      };
      reader.readAsDataURL(file);
    }
  }

  removeDataRow(index: number, dataItem: PaymentData) {
    if (dataItem.id) {
      this.openConfirm('¿Eliminar este campo permanentemente?', () => {
        this.paymentService.deleteData(dataItem.id!).subscribe(() => {
          const currentList = this.paymentDataList();
          currentList.splice(index, 1);
          this.paymentDataList.set([...currentList]);
        });
      });
    } else {
      const currentList = this.paymentDataList();
      currentList.splice(index, 1);
      this.paymentDataList.set([...currentList]);
    }
  }

  savePaymentData() {
    const currentList = this.paymentDataList();
    const toCreate = currentList.filter(d => !d.id);
    const toUpdate = currentList.filter(d => d.id);

    if (toCreate.length > 0) { this.paymentService.createData(toCreate).subscribe(); }
    if (toUpdate.length > 0) { this.paymentService.updateData(toUpdate).subscribe(); }
    
    this.notify.show('success', 'Campos de datos guardados correctamente.');
    this.closeDataModal();
  }
}