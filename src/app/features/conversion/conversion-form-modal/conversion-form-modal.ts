import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Coin } from '../../../entities/coin';
import { Conversion, ConversionService } from '../../../entities/conversion';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-conversion-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversion-form-modal.html',
  styleUrl: './conversion-form-modal.css',
})
export class ConversionFormModalComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Input() conversionToEdit: Conversion | null = null;
  @Input() availableCoins: Coin[] = [];

  private conversionService = inject(ConversionService);
  private notify = inject(NotificationService);

  fromToRateInput = '';

  conversion: Conversion = {
    fromCoinID: 0,
    toCoinID: 0,
    fromToRate: 0,
    toFromRate: 0,
    isActive: true,
  };

  ngOnInit() {
    if (this.conversionToEdit) {
      this.conversion = { ...this.conversionToEdit };
    }

    this.syncRateInput();
  }

  saveConversion() {
    const fromToRate = this.parseDecimalInput(this.fromToRateInput);
    const toFromRate = this.calculateReverseRate(fromToRate);

    if (!this.conversion.fromCoinID || !this.conversion.toCoinID) {
      this.notify.show('error', 'Selecciona la moneda origen y la moneda destino.');
      return;
    }

    if (this.conversion.fromCoinID === this.conversion.toCoinID) {
      this.notify.show('error', 'La moneda origen y destino no pueden ser iguales.');
      return;
    }

    if (!Number.isFinite(fromToRate) || fromToRate <= 0 || !toFromRate) {
      this.notify.show('error', 'Ingresa una equivalencia mayor a cero.');
      return;
    }

    const payload: Conversion = {
      ...this.conversion,
      fromToRate,
      toFromRate,
    };

    const request$ = payload.id
      ? this.conversionService.update(payload)
      : this.conversionService.create(payload);

    request$.subscribe({
      next: (res) => {
        if (res?.success) {
          this.notify.show('success', payload.id ? 'Conversion actualizada correctamente.' : 'Conversion registrada correctamente.');
          this.onSave.emit();
          return;
        }

        this.notify.show('error', this.extractErrorMessage(res));
      },
      error: (err) => this.notify.show('error', this.extractErrorMessage(err?.error)),
    });
  }

  closeModal() {
    this.onClose.emit();
  }

  normalizeFromToRateInput() {
    const value = this.parseDecimalInput(this.fromToRateInput);
    if (Number.isFinite(value)) {
      this.fromToRateInput = this.formatDecimalInput(value);
    }
  }

  swapCoins() {
    const previousFrom = this.conversion.fromCoinID;
    this.conversion.fromCoinID = this.conversion.toCoinID;
    this.conversion.toCoinID = previousFrom;

    const currentRate = this.parseDecimalInput(this.fromToRateInput);
    const reverseRate = this.calculateReverseRate(currentRate);
    if (reverseRate) {
      this.fromToRateInput = this.formatDecimalInput(reverseRate);
    }
  }

  coinLabel(coinID: number): string {
    const coin = this.availableCoins.find(item => item.id === coinID);
    return coin ? `${coin.code} (${coin.symbol})` : `Moneda #${coinID || '-'}`;
  }

  coinCode(coinID: number): string {
    return this.availableCoins.find(item => item.id === coinID)?.code || 'moneda';
  }

  directPreview(): string {
    const rate = this.parseDecimalInput(this.fromToRateInput);
    if (!this.conversion.fromCoinID || !this.conversion.toCoinID) {
      return 'Selecciona las monedas para crear la equivalencia.';
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      return `Indica cuanto vale 1 ${this.coinCode(this.conversion.fromCoinID)} en ${this.coinCode(this.conversion.toCoinID)}.`;
    }
    return `1 ${this.coinCode(this.conversion.fromCoinID)} = ${this.formatDecimalInput(rate)} ${this.coinCode(this.conversion.toCoinID)}`;
  }

  reversePreview(): string {
    const rate = this.parseDecimalInput(this.fromToRateInput);
    const reverseRate = this.calculateReverseRate(rate);
    if (!reverseRate || !this.conversion.fromCoinID || !this.conversion.toCoinID) {
      return 'El reverso se calculara automaticamente.';
    }
    return `1 ${this.coinCode(this.conversion.toCoinID)} = ${this.formatDecimalInput(reverseRate)} ${this.coinCode(this.conversion.fromCoinID)}`;
  }

  private syncRateInput() {
    this.fromToRateInput = this.conversion.fromToRate ? this.formatDecimalInput(this.conversion.fromToRate) : '';
  }

  private calculateReverseRate(value: number): number | null {
    if (!Number.isFinite(value) || value <= 0) return null;
    return Number((1 / value).toFixed(8));
  }

  private formatDecimalInput(value: number): string {
    return value.toFixed(8).replace(/\.?0+$/g, '').replace('.', ',');
  }

  private parseDecimalInput(value: string | number | null | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : NaN;
    }

    const raw = String(value ?? '').trim().replace(/\s/g, '');
    if (!raw) return NaN;

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
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  private extractErrorMessage(payload: any): string {
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return payload.errors.filter(Boolean).join(' | ');
    }
    if (typeof payload?.response === 'string' && payload.response.trim()) return payload.response.trim();
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
    return 'No se pudo guardar la conversion.';
  }
}