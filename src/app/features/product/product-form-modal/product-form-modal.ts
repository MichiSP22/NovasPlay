import { Component, EventEmitter, Output, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../../entities/product';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-form-modal.html',
  styleUrl: './product-form-modal.css'
})
export class ProductFormModalComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Input() productToEdit: Product | null = null;

  private productService: ProductService = inject(ProductService);
  private notify = inject(NotificationService);

  product: Product = {
    name: '',
    description: '',
    timeMinRecharge: '00:05:00', // Valores por defecto (5 minutos a 15 min)
    timeMaxRecharge: '00:15:00',
    soldOut: false,
    internalProcess: false
  };

  // Ayudantes para la UI de duración
  minHours: number = 0;
  minMinutes: number = 5;
  maxHours: number = 0;
  maxMinutes: number = 15;

  selectedImage: File | null = null;
  selectedIcon: File | null = null;

  ngOnInit() {
    if (this.productToEdit) {
      this.product = { ...this.productToEdit };
      this.parseTimes();
    }
  }

  private parseTimes() {
    // Parsea "HH:mm:ss"
    const parse = (timeStr: string) => {
      const parts = (timeStr || '00:00:00').split(':');
      return {
        h: parseInt(parts[0]) || 0,
        m: parseInt(parts[1]) || 0
      };
    };

    const min = parse(this.product.timeMinRecharge);
    this.minHours = min.h;
    this.minMinutes = min.m;

    const max = parse(this.product.timeMaxRecharge);
    this.maxHours = max.h;
    this.maxMinutes = max.m;
  }

  onImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) this.selectedImage = file;
  }

  onIconSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) this.selectedIcon = file;
  }

  saveProduct() {
    if (!this.product.id && (!this.selectedImage || !this.selectedIcon)) {
      this.notify.show('error', 'Por favor selecciona tanto la Imagen como el Ícono del producto.');
      return;
    }

    // Reconstruir TimeSpan "HH:mm:ss" desde Horas y Minutos
    const toTimeSpan = (h: number, m: number) => {
      const hh = Math.floor(h || 0).toString().padStart(2, '0');
      const mm = Math.floor(m || 0).toString().padStart(2, '0');
      return `${hh}:${mm}:00`;
    };

    const productDataToSend: Product = {
      ...this.product,
      timeMinRecharge: toTimeSpan(this.minHours, this.minMinutes),
      timeMaxRecharge: toTimeSpan(this.maxHours, this.maxMinutes),
      imageFile: this.selectedImage || undefined,
      iconFile: this.selectedIcon || undefined
    };

    const request$ = this.product.id
      ? this.productService.update(productDataToSend)
      : this.productService.create(productDataToSend);

    request$.subscribe({
      next: (res) => {
        if (res?.success) {
          this.notify.show('success', this.product.id ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.');
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
    return 'No se pudo guardar el producto.';
  }
}
