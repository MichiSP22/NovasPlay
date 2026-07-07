import { Component, EventEmitter, Output, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoinService, Coin } from '../../../entities/coin';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-coin-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coin-form-modal.html',
  styleUrl: './coin-form-modal.css'
})
export class CoinFormModalComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Input() coinToEdit: Coin | null = null;

  private coinService = inject(CoinService);
  private notify = inject(NotificationService);

  // Modelo del formulario
  coin: Coin = {
    name: '',
    code: '',
    symbol: ''
  };

  ngOnInit() {
    if (this.coinToEdit) {
      this.coin = { ...this.coinToEdit };
    }
  }

  saveCoin() {
    const request$ = this.coin.id
      ? this.coinService.update(this.coin)
      : this.coinService.create(this.coin);

    request$.subscribe({
      next: (res) => {
        if (res?.success) {
          this.notify.show('success', this.coin.id ? 'Moneda actualizada correctamente.' : 'Moneda registrada correctamente.');
          this.onSave.emit();
          return;
        }
        this.notify.show('error', this.extractErrorMessage(res));
      },
      error: (err) => this.notify.show('error', this.extractErrorMessage(err?.error))
    });
  }

  closeModal() {
    this.onClose.emit();
  }

  private extractErrorMessage(payload: any): string {
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return payload.errors.filter(Boolean).join(' | ');
    }
    if (typeof payload?.response === 'string' && payload.response.trim()) return payload.response.trim();
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
    return 'No se pudo guardar la moneda.';
  }
}
