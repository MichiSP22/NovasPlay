import { Component, EventEmitter, Output, Input, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Order, ChangeOrderStatusPayload, OrderStatus, getCurrencySymbol } from '../../../entities/order';
import { NotificationService } from '../../../shared/ui/toast/notification.service';
import { UserService } from '../../../entities/user';

@Component({
  selector: 'app-order-status-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-status-modal.html',
  styleUrl: './order-status-modal.css'
})
export class OrderStatusModalComponent implements OnChanges {
  @Output() onClose = new EventEmitter<void>();
  @Output() onProcess = new EventEmitter<void>();

  @Input() orderToProcess!: Order;

  private orderService = inject(OrderService);
  private userService = inject(UserService);
  private notify = inject(NotificationService);

  // Variables para el formulario del admin
  rechargeStatuses: { [key: number]: number } = {};
  private originalStatuses: { [key: number]: number } = {};
  adminNotes: string = '';
  currencySymbol = getCurrencySymbol;
  private currentUserId: string = '';

  constructor() {
    // Obtener el ID del usuario logueado para la atribución de auditoría.
    // Paso 1: Obtener email via /User/Me
    // Paso 2: Buscar el UserID via /User/Search por email
    // IMPORTANTE: Si no se encuentra, NO usar items[0] como fallback (eso causaba el bug original)
    this.userService.getMe().subscribe({
      next: (res) => {
        if (res.success && res.value) {
          const email = res.value.email || '';
          if (email) {
            this.userService.search({
              pageNumber: 1,
              pageSize: 100,
              filters: [{ field: 'LoginInfo.Email', operator: 0, value: email }]
            }).subscribe({
              next: (searchRes: any) => {
                if (searchRes.success && searchRes.value) {
                  const items = searchRes.value.items || searchRes.value || [];
                  if (items.length > 0) {
                    const emailLower = email.toLowerCase();
                    // Buscar EXACTAMENTE por email — NO usar items[0] como fallback
                    const matchedUser = items.find((u: any) =>
                      (u.LoginInfo_Email || u.logininfo_email || u.email || '').toLowerCase() === emailLower
                    );
                    if (matchedUser) {
                      this.currentUserId = matchedUser.UserID || matchedUser.Id || matchedUser.id || matchedUser.userId || '';
                    }
                    // Si no encontró match exacto, currentUserId queda vacío (seguro)
                  }
                }
              }
            });
          }
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['orderToProcess'] && this.orderToProcess) {
      if (this.orderToProcess.OrderDetails) {
        this.orderToProcess.OrderDetails.forEach(item => {
          const id = item.id ?? item.detailID;
          if (id !== undefined) {
            const parsed = Number(item.status ?? OrderStatus.Pending);
            const status = isNaN(parsed) ? OrderStatus.Pending : parsed;
            this.rechargeStatuses[id] = status;
            this.originalStatuses[id] = status;
          }
        });
      }
    }
  }

  processOrder() {
    if (!this.orderToProcess) return;

    // Inyectar el ID del admin/soporte en la descripción para auditoría
    let finalDescription = this.adminNotes || '';
    if (this.currentUserId) {
      finalDescription = `[ADMIN:${this.currentUserId}] ${finalDescription}`.trim();
    }

    const allRecharges = this.orderToProcess.OrderDetails?.map(item => {
      const id = item.id ?? item.detailID;
      return {
        ID: id,
        Status: Number(this.rechargeStatuses[id]),
        originalStatus: Number(this.originalStatuses[id] ?? 0)
      };
    }) || [];

    // 1. Identificar qué recargas CAMBIARON
    const changedRecharges = allRecharges.filter((r: any) => r.Status !== r.originalStatus);

    // 2. Definir cuáles son estados finales (Confirmado, Completado, Reembolsado, Cancelado)
    // Usamos 3, 4, 5 como los "críticos" que cierran la orden
    const isFinalStatus = (s: number) => [1, 3, 4, 5].includes(s);
    const hasFinalChanges = changedRecharges.some((r: any) => isFinalStatus(r.Status));

    let rechargestoSend: { ID: number; Status: number }[] = [];

    if (hasFinalChanges) {
      // Si hay estados finales entre los cambios, SOLO enviamos esos para proteger
      // las recargas que todavía están en "Procesando" (debido al bug del backend)
      rechargestoSend = changedRecharges
        .filter((r: any) => isFinalStatus(r.Status))
        .map(({ ID, Status }) => ({ ID, Status }));
    } else {
      // Si NO hay estados finales (ej: solo pusiste "Procesando"), enviamos todo lo que cambió
      rechargestoSend = changedRecharges.map(({ ID, Status }) => ({ ID, Status }));
    }

    if (rechargestoSend.length === 0) {
      // Verificar si todas ya están en estado final
      const allAlreadyFinal = allRecharges.every((r: any) => isFinalStatus(r.originalStatus));
      if (allAlreadyFinal) {
        this.notify.show('error', 'Todas las recargas ya se encuentran en estado final y no se pueden modificar.');
      } else {
        this.notify.show('error', 'No has realizado ningún cambio de estado en las recargas.');
      }
      return;
    }

    const payload: ChangeOrderStatusPayload = {
      OrderID: this.orderToProcess.id,
      Details: rechargestoSend,
      description: finalDescription
    };

    this.orderService.changeStatus(payload).subscribe({
      next: (res) => {
        if (res.success) {
          // Contar solo recargas que aún NO están en estado final (ni original ni nuevo)
          const pendientes = allRecharges.filter((r: any) =>
            !isFinalStatus(r.Status) && !isFinalStatus(r.originalStatus)
          ).length;
          if (pendientes > 0) {
            this.notify.show('success', `Orden procesada. ${pendientes} recarga(s) quedaron pendientes para procesar después.`);
          } else {
            this.notify.show('success', 'Orden procesada exitosamente');
          }
          this.onProcess.emit();
        } else {
          this.notify.show('error', this.extractErrorMessage(res));
        }
      },
      error: (err) => this.notify.show('error', this.extractErrorMessage(err?.error))
    });
  }

  closeModal() {
    this.onClose.emit();
  }

  cleanDescription(desc: string | undefined): string {
    if (!desc) return 'Sin notas';
    const cleaned = desc.replace(/\[ADMIN:[a-f0-9-]+\]\s*/i, '').trim();
    return cleaned || 'Sin notas';
  }

  private extractErrorMessage(payload: any): string {
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return payload.errors.filter(Boolean).join(' | ');
    }
    if (typeof payload?.response === 'string' && payload.response.trim()) return payload.response.trim();
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
    return 'Error procesando la orden.';
  }
}
