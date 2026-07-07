import { Component, EventEmitter, Output, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Vital para que funcione el ngModel
import { CategoryService, Category } from '../../../entities/category';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-category-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-form-modal.html',
  styleUrl: './category-form-modal.css'
})
export class CategoryFormModalComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Input() categoryToEdit: Category | null = null;

  private categoryService = inject(CategoryService);
  private notify = inject(NotificationService);

  // Modelo básico para el formulario
  category: Category = {
    name: '',
    description: ''
  };

  // Variables para atrapar los archivos físicos de la PC del usuario
  selectedImage: File | null = null;
  selectedIcon: File | null = null;

  ngOnInit() {
    if (this.categoryToEdit) {
      this.category = { ...this.categoryToEdit };
    }
  }

  // Atrapamos la Imagen Principal
  onImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) this.selectedImage = file;
  }

  // Atrapamos el Ícono
  onIconSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) this.selectedIcon = file;
  }

  saveCategory() {
    // Validación estricta: Si es nuevo, debe tener ambos archivos
    if (!this.category.id && (!this.selectedImage || !this.selectedIcon)) {
      this.notify.show('error', 'Por favor selecciona tanto la Imagen como el Ícono de la categoría.');
      return;
    }

    const categoryDataToSend: Category = {
      ...this.category,
      imageFile: this.selectedImage || undefined,
      iconFile: this.selectedIcon || undefined
    };

    const request$ = this.category.id
      ? this.categoryService.update(categoryDataToSend)
      : this.categoryService.create(categoryDataToSend);

    request$.subscribe({
      next: (res) => {
        if (res?.success) {
          this.notify.show('success', this.category.id ? 'Categoría actualizada correctamente.' : 'Categoría registrada correctamente.');
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
    return 'No se pudo guardar la categoría.';
  }
}
