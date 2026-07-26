import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentImage, ContentImageCategory, CONTENT_IMAGE_CATEGORY_OPTIONS, ContentImageService } from '../../../entities/content-image';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-content-image-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './content-image-form-modal.html',
  styleUrl: './content-image-form-modal.css',
})
export class ContentImageFormModalComponent implements OnInit, OnDestroy {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  @Input() imageToEdit: ContentImage | null = null;

  private contentImageService = inject(ContentImageService);
  private notify = inject(NotificationService);

  categories = CONTENT_IMAGE_CATEGORY_OPTIONS;
  selectedImage: File | null = null;
  previewUrl = '';
  saving = false;

  image: ContentImage = this.createEmptyImage();

  ngOnInit() {
    if (this.imageToEdit) {
      this.image = {
        ...this.imageToEdit,
        startsAt: this.toDateInput(this.imageToEdit.startsAt),
        expiresAt: this.toDateInput(this.imageToEdit.expiresAt),
      };
      this.previewUrl = this.imageToEdit.link || '';
    }
  }

  ngOnDestroy() {
    this.revokeObjectPreview();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.notify.show('error', 'Selecciona una imagen valida.');
      input.value = '';
      return;
    }

    this.revokeObjectPreview();
    this.selectedImage = file;
    this.previewUrl = URL.createObjectURL(file);
  }

  clearSelectedImage(input?: HTMLInputElement) {
    this.revokeObjectPreview();
    this.selectedImage = null;
    this.previewUrl = this.image.link || '';
    if (input) input.value = '';
  }

  saveImage() {
    if (this.saving) return;

    const category = String(this.image.category || '').trim();
    if (!category) {
      this.notify.show('error', 'Selecciona una categoria.');
      return;
    }

    const hasImage = !!this.selectedImage;
    const hasLink = !!this.image.link?.trim();
    if (!this.image.id && !hasImage && !hasLink) {
      this.notify.show('error', 'Sube una imagen o ingresa un link.');
      return;
    }

    if (this.image.startsAt && this.image.expiresAt && this.image.startsAt > this.image.expiresAt) {
      this.notify.show('error', 'La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    const payload: ContentImage = {
      ...this.image,
      category,
      link: this.image.link?.trim() || undefined,
      targetLink: this.image.targetLink?.trim() || undefined,
      imageFile: this.selectedImage || undefined,
    };

    this.saving = true;
    const request$ = payload.id
      ? this.contentImageService.update(payload)
      : this.contentImageService.create(payload);

    request$.subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.success) {
          this.notify.show('success', payload.id ? 'Anuncio actualizado correctamente.' : 'Anuncio creado correctamente.');
          this.onSave.emit();
          return;
        }
        this.notify.show('error', this.extractErrorMessage(res));
      },
      error: (err) => {
        this.saving = false;
        this.notify.show('error', this.extractErrorMessage(err?.error));
      },
    });
  }

  closeModal() {
    this.onClose.emit();
  }

  private createEmptyImage(): ContentImage {
    return {
      category: ContentImageCategory.Announcements,
      link: '',
      targetLink: '#catalogo',
      startsAt: '',
      expiresAt: '',
      active: true,
    };
  }

  private toDateInput(value: string | undefined): string {
    if (!value) return '';
    return value.slice(0, 10);
  }

  private revokeObjectPreview() {
    if (this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  private extractErrorMessage(payload: any): string {
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return payload.errors.filter(Boolean).join(' | ');
    }
    if (typeof payload?.response === 'string' && payload.response.trim()) return payload.response.trim();
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
    return 'No se pudo guardar el anuncio.';
  }
}