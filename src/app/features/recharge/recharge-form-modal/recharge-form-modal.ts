import { Component, EventEmitter, Output, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RechargeService, Recharge } from '../../../entities/recharge';
import { Product } from '../../../entities/product'; // Necesitamos la interfaz del Producto
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-recharge-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recharge-form-modal.html',
  styleUrl: './recharge-form-modal.css'
})
export class RechargeFormModalComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Input() rechargeToEdit: Recharge | null = null;
  
  // Recibimos los productos desde el Manager para llenar el <select>
  @Input() availableProducts: Product[] = []; 

  private rechargeService = inject(RechargeService);
  private notify = inject(NotificationService);

  recharge: Recharge = {
    productID: 0,
    name: '',
    description: '',
    soldOut: false
  };

  selectedImage: File | null = null;
  selectedIcon: File | null = null;

  ngOnInit() {
    if (this.rechargeToEdit) {
      this.recharge = { ...this.rechargeToEdit };
    } else if (this.availableProducts.length > 0) {
      // Seleccionar el primer producto por defecto si es una nueva recarga
      this.recharge.productID = this.availableProducts[0].id!;
    }
  }

  onImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) this.selectedImage = file;
  }

  onIconSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) this.selectedIcon = file;
  }

  saveRecharge() {
    if (!this.recharge.productID) {
      this.notify.show('error', 'Por favor selecciona un producto válido.');
      return;
    }

    if (!this.recharge.id && (!this.selectedImage || !this.selectedIcon)) {
      this.notify.show('error', 'Por favor selecciona tanto la Imagen como el Ícono.');
      return;
    }

    const rechargeDataToSend: Recharge = {
      ...this.recharge,
      imageFile: this.selectedImage || undefined,
      iconFile: this.selectedIcon || undefined
    };

    const request$ = this.recharge.id
      ? this.rechargeService.update(rechargeDataToSend)
      : this.rechargeService.create(rechargeDataToSend);

    request$.subscribe({
      next: (res) => {
        if (res?.success) {
          this.notify.show('success', this.recharge.id ? 'Recarga actualizada correctamente.' : 'Recarga registrada correctamente.');
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
    return 'No se pudo guardar la recarga.';
  }
}
