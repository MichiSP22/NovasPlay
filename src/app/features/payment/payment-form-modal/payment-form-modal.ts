import { Component, EventEmitter, Output, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, Payment } from '../../../entities/payment';
import { Coin } from '../../../entities/coin';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-payment-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-form-modal.html',
  styleUrl: './payment-form-modal.css'
})
export class PaymentFormModalComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Input() paymentToEdit: Payment | null = null;
  @Input() coins: Coin[] = []; 

  private paymentService = inject(PaymentService);
  private notify = inject(NotificationService);

  payment: Payment = {
    coinID: 0,
    name: '',
    description: '',
    international: false
  };

  ngOnInit() {
    if (this.paymentToEdit) {
      this.payment = { ...this.paymentToEdit };
    } else if (this.coins.length > 0) {
      this.payment.coinID = this.coins[0].id!;
    }
  }

  onFileChange(event: any, field: 'imageFile' | 'iconFile') {
    const file = event.target.files[0];
    if (file) {
      this.payment[field] = file;
    }
  }

  savePayment() {
    const request$ = this.payment.id
      ? this.paymentService.update(this.payment)
      : this.paymentService.create(this.payment);

    request$.subscribe({
      next: (res) => {
        if (res?.success) {
          this.notify.show('success', this.payment.id ? 'Método de pago actualizado correctamente.' : 'Método de pago registrado correctamente.');
          this.onSave.emit();
          return;
        }

        const message = this.extractErrorMessage(res);
        this.notify.show('error', message);
      },
      error: (err) => {
        const message = this.extractErrorMessage(err?.error);
        this.notify.show('error', message);
      }
    });
  }

  closeModal() {
    this.onClose.emit();
  }

  private extractErrorMessage(payload: any): string {
    const errors = payload?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors.filter(Boolean).join(' | ');
    }
    if (typeof payload?.response === 'string' && payload.response.trim()) {
      return payload.response.trim();
    }
    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }
    return 'No se pudo guardar el método de pago.';
  }
}
