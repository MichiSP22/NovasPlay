import { Component, EventEmitter, Output, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CountryService, Country } from '../../../entities/country';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-country-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './country-form-modal.html',
  styleUrl: './country-form-modal.css',
})
export class CountryFormModalComponent implements OnInit {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Input() countryToEdit: Country | null = null;

  selectedImage: File | null = null;
  selectedIcon: File | null = null;

  private countryService = inject(CountryService);
  private notify = inject(NotificationService);

  country: Country = {
    name: '',
    isoCode: '',
  };

  ngOnInit() {
    if (this.countryToEdit) {
      this.country = { ...this.countryToEdit };
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedImage = file;
      this.selectedIcon = file;
    }
  }

  saveCountry() {
    this.country.name = (this.country.name || '').trim();
    this.country.isoCode = (this.country.isoCode || '').trim().toUpperCase();

    if (!this.country.name || !this.country.isoCode) {
      this.notify.show('error', 'Completa el nombre y el codigo ISO del pais.');
      return;
    }

    if (!this.country.id && !this.selectedImage) {
      this.notify.show('error', 'Por favor selecciona una imagen para el pais.');
      return;
    }

    const countryDataToSend: Country = {
      ...this.country,
      imageFile: this.selectedImage || undefined,
      iconFile: this.selectedIcon || undefined,
    };

    const request$ = this.country.id
      ? this.countryService.update(countryDataToSend)
      : this.countryService.create(countryDataToSend);

    request$.subscribe({
      next: (res) => {
        if (res?.success) {
          this.notify.show('success', this.country.id ? 'Pais actualizado correctamente.' : 'Pais registrado correctamente.');
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

  private extractErrorMessage(payload: any): string {
    const errors = payload?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors.filter(Boolean).join(' | ');
    }
    if (errors && typeof errors === 'object') {
      const messages = Object.entries(errors)
        .flatMap(([field, value]) => {
          const list = Array.isArray(value) ? value : [value];
          return list.filter(Boolean).map(message => `${field}: ${message}`);
        });
      if (messages.length > 0) return messages.join(' | ');
    }
    if (typeof payload?.response === 'string' && payload.response.trim()) return payload.response.trim();
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
    return 'No se pudo guardar el pais.';
  }
}
