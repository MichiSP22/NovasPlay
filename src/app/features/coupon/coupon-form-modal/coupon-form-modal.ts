import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Coupon, CouponService } from '../../../entities/coupon';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-coupon-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupon-form-modal.html',
  styleUrl: './coupon-form-modal.css',
})
export class CouponFormModalComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Input() couponToEdit: Coupon | null = null;

  private couponService = inject(CouponService);
  private notify = inject(NotificationService);

  valueInput = '';
  minimumAmountInput = '';
  maximumDiscountInput = '';

  coupon: Coupon = {
    code: '',
    name: '',
    description: '',
    discountType: 0,
    scope: 0,
    value: 0,
    minimumAmount: undefined,
    maximumDiscount: undefined,
    usageLimit: undefined,
    maxUsesPerUser: undefined,
    usageCount: 0,
    startDate: '',
    endDate: '',
    active: true,
    userID: '',
    detailID: null,
    productID: null,
    categoryID: null,
  };

  ngOnInit() {
    if (this.couponToEdit) {
      this.coupon = { ...this.couponToEdit };
      this.coupon.startDate = this.toDateInput(this.coupon.startDate);
      this.coupon.endDate = this.toDateInput(this.coupon.endDate);
    }

    this.syncDecimalInputs();
  }

  saveCoupon() {
    const value = this.parseDecimalInput(this.valueInput);
    const minimumAmount = this.parseOptionalDecimalInput(this.minimumAmountInput);
    const maximumDiscount = this.parseOptionalDecimalInput(this.maximumDiscountInput);
    const code = this.coupon.code.trim().toUpperCase();

    if (!code) {
      this.notify.show('error', 'Ingresa el codigo del cupon.');
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      this.notify.show('error', 'Ingresa un descuento mayor a cero.');
      return;
    }

    if (this.coupon.discountType === 0 && value > 100) {
      this.notify.show('error', 'El porcentaje no puede ser mayor a 100.');
      return;
    }

    if (this.coupon.startDate && this.coupon.endDate && this.coupon.startDate > this.coupon.endDate) {
      this.notify.show('error', 'La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    if (this.coupon.scope === 2 && !this.coupon.detailID) {
      this.notify.show('error', 'Ingresa el ID de la recarga para este alcance.');
      return;
    }

    if (this.coupon.scope === 3 && !this.coupon.productID) {
      this.notify.show('error', 'Ingresa el ID del producto para este alcance.');
      return;
    }

    if (this.coupon.scope === 4 && !this.coupon.categoryID) {
      this.notify.show('error', 'Ingresa el ID de la categoria para este alcance.');
      return;
    }

    const payload: Coupon = {
      ...this.coupon,
      code,
      name: (this.coupon.name || code).trim(),
      value,
      minimumAmount,
      maximumDiscount,
      usageLimit: this.coupon.usageLimit ? Number(this.coupon.usageLimit) : undefined,
      maxUsesPerUser: this.coupon.maxUsesPerUser ? Number(this.coupon.maxUsesPerUser) : undefined,
    };

    const request$ = payload.id
      ? this.couponService.update(payload)
      : this.couponService.create(payload);

    request$.subscribe({
      next: (res) => {
        if (res?.success) {
          this.notify.show('success', payload.id ? 'Cupon actualizado correctamente.' : 'Cupon creado correctamente.');
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

  normalizeValueInput() {
    const value = this.parseDecimalInput(this.valueInput);
    if (Number.isFinite(value)) this.valueInput = this.formatDecimalInput(value);
  }

  normalizeMinimumAmountInput() {
    const value = this.parseOptionalDecimalInput(this.minimumAmountInput);
    if (value !== undefined && Number.isFinite(value)) this.minimumAmountInput = this.formatDecimalInput(value);
  }

  normalizeMaximumDiscountInput() {
    const value = this.parseOptionalDecimalInput(this.maximumDiscountInput);
    if (value !== undefined && Number.isFinite(value)) this.maximumDiscountInput = this.formatDecimalInput(value);
  }

  private syncDecimalInputs() {
    this.valueInput = this.coupon.value ? this.formatDecimalInput(this.coupon.value) : '';
    this.minimumAmountInput = this.coupon.minimumAmount ? this.formatDecimalInput(this.coupon.minimumAmount) : '';
    this.maximumDiscountInput = this.coupon.maximumDiscount ? this.formatDecimalInput(this.coupon.maximumDiscount) : '';
  }

  private toDateInput(value: string | undefined): string {
    if (!value) return '';
    return value.slice(0, 10);
  }

  private formatDecimalInput(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }

  private parseOptionalDecimalInput(value: string | number | null | undefined): number | undefined {
    const raw = String(value ?? '').trim();
    if (!raw) return undefined;
    const parsed = this.parseDecimalInput(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private parseDecimalInput(value: string | number | null | undefined): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;

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
    return 'No se pudo guardar el cupon.';
  }
}
