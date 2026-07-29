import { Component, EventEmitter, Output, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PriceService, Price } from '../../../entities/price';
import { Recharge } from '../../../entities/recharge';
import { Payment } from '../../../entities/payment';
import { Product } from '../../../entities/product';
import { Coin } from '../../../entities/coin';
import { Conversion, rateBetween } from '../../../entities/conversion';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-price-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './price-form-modal.html',
  styleUrl: './price-form-modal.css'
})
export class PriceFormModalComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Input() priceToEdit: Price | null = null;

  @Input() availableRecharges: Recharge[] = [];
  @Input() availablePayments: Payment[] = [];
  @Input() availableProducts: Product[] = [];
  @Input() availableCoins: Coin[] = [];
  @Input() availableConversions: Conversion[] = [];

  selectedProductID: number = 0;
  regularPriceInput = '';
  promotionPriceInput = '';
  filteredRecharges: Recharge[] = [];

  private priceService = inject(PriceService);
  private notify = inject(NotificationService);

  price: Price = {
    detailID: 0,
    paymentID: 0,
    referenceCurrencyID: null,
    price: 0,
    promotion: false,
    promotionPrice: 0
  };

  ngOnInit() {
    this.filteredRecharges = [...this.availableRecharges];

    if (this.priceToEdit) {
      this.price = { ...this.priceToEdit };

      const currentRecharge = this.availableRecharges.find(r => r.id === this.price.detailID);
      if (currentRecharge?.productID) {
        this.selectedProductID = currentRecharge.productID;
        this.onProductChange();
      }
    }

    this.clearReferenceCurrencyIfDirect();
    this.syncPriceInputs();
  }

  onProductChange() {
    if (this.selectedProductID > 0) {
      this.filteredRecharges = this.availableRecharges.filter(r => r.productID === this.selectedProductID);
    } else {
      this.filteredRecharges = [...this.availableRecharges];
    }

    if (this.price.detailID > 0) {
      const stillValid = this.filteredRecharges.find(r => r.id === this.price.detailID);
      if (!stillValid) {
        this.price.detailID = 0;
      }
    }
  }

  onPaymentChange() {
    this.clearReferenceCurrencyIfDirect();
  }

  onReferenceCurrencyChange() {
    this.clearReferenceCurrencyIfDirect();
  }

  savePrice() {
    const regularPrice = this.parseDecimalInput(this.regularPriceInput);
    const promotionPrice = this.price.promotion
      ? this.parseDecimalInput(this.promotionPriceInput)
      : 0;

    if (!this.price.detailID || !this.price.paymentID || !Number.isFinite(regularPrice) || regularPrice <= 0) {
      this.notify.show('error', 'Por favor selecciona una recarga, un metodo de pago y un precio mayor a cero.');
      return;
    }

    if (this.price.promotion && (!Number.isFinite(promotionPrice) || promotionPrice < 0)) {
      this.notify.show('error', 'Por favor ingresa un precio de promocion valido.');
      return;
    }

    const referenceCurrencyID = this.normalizedReferenceCurrencyID();
    if (referenceCurrencyID && !rateBetween(this.availableConversions, referenceCurrencyID, this.selectedPaymentCoinID())) {
      this.notify.show('error', 'No hay una conversion activa para esa moneda base y el metodo de pago elegido.');
      return;
    }

    const payload: Price = {
      ...this.price,
      referenceCurrencyID,
      price: regularPrice,
      promotionPrice
    };

    const request$ = payload.id
      ? this.priceService.update([payload])
      : this.priceService.create([payload]);

    request$.subscribe({
      next: (res) => {
        if (res?.success) {
          this.notify.show('success', this.price.id ? 'Precio actualizado correctamente.' : 'Precio registrado correctamente.');
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

  normalizeRegularPriceInput() {
    const value = this.parseDecimalInput(this.regularPriceInput);
    if (Number.isFinite(value)) {
      this.regularPriceInput = this.formatDecimalInput(value);
    }
  }

  normalizePromotionPriceInput() {
    const value = this.parseDecimalInput(this.promotionPriceInput);
    if (Number.isFinite(value)) {
      this.promotionPriceInput = this.formatDecimalInput(value);
    }
  }

  selectedPaymentCoinID(): number {
    return this.availablePayments.find(payment => payment.id === this.price.paymentID)?.coinID || 0;
  }

  selectedPaymentCoinLabel(): string {
    const coinID = this.selectedPaymentCoinID();
    const coin = this.availableCoins.find(item => item.id === coinID);
    return coin ? `${coin.code} (${coin.symbol})` : 'la moneda del metodo';
  }

  referenceCurrencyLabel(): string {
    const coinID = this.normalizedReferenceCurrencyID();
    if (!coinID) return this.selectedPaymentCoinLabel();

    const coin = this.availableCoins.find(item => item.id === coinID);
    return coin ? `${coin.code} (${coin.symbol})` : `Moneda #${coinID}`;
  }

  conversionPreview(): string {
    const referenceCurrencyID = this.normalizedReferenceCurrencyID();
    const paymentCoinID = this.selectedPaymentCoinID();
    const regularPrice = this.parseDecimalInput(this.regularPriceInput);

    if (!this.price.paymentID) {
      return 'Selecciona un metodo de pago para ver la moneda de cobro.';
    }

    if (!referenceCurrencyID) {
      return `Se cobrara directamente en ${this.selectedPaymentCoinLabel()}.`;
    }

    const rate = rateBetween(this.availableConversions, referenceCurrencyID, paymentCoinID);
    if (!rate) {
      return `Falta una conversion activa de ${this.referenceCurrencyLabel()} a ${this.selectedPaymentCoinLabel()}.`;
    }

    if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
      return `1 ${this.referenceCurrencyLabel()} = ${this.formatDecimalInput(rate)} ${this.selectedPaymentCoinLabel()}.`;
    }

    const converted = regularPrice * rate;
    return `${this.formatDecimalInput(regularPrice)} ${this.referenceCurrencyLabel()} se mostrara como ${this.formatDecimalInput(converted)} ${this.selectedPaymentCoinLabel()}.`;
  }

  private syncPriceInputs() {
    this.regularPriceInput = this.price.price ? this.formatDecimalInput(this.price.price) : '';
    this.promotionPriceInput = this.price.promotionPrice
      ? this.formatDecimalInput(this.price.promotionPrice)
      : '';
  }

  private formatDecimalInput(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }

  private clearReferenceCurrencyIfDirect() {
    if (this.price.referenceCurrencyID === this.selectedPaymentCoinID()) {
      this.price.referenceCurrencyID = null;
    }
  }

  private normalizedReferenceCurrencyID(): number | null {
    const referenceCurrencyID = Number(this.price.referenceCurrencyID || 0);
    if (!referenceCurrencyID || referenceCurrencyID === this.selectedPaymentCoinID()) {
      return null;
    }
    return referenceCurrencyID;
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
    return 'No se pudo guardar el precio.';
  }
}
