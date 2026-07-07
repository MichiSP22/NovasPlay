import { Component, EventEmitter, Output, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User } from '../../../entities/user';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-user-role-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-role-modal.html',
  styleUrl: './user-role-modal.css'
})
export class UserRoleModalComponent {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<void>();
  
  @Input() userToEdit!: User;

  private userService = inject(UserService);
  private notify = inject(NotificationService);

  newRole: string = '';
  securityKey: string = ''; // 🚩 Agregamos la variable para la clave

  ngOnInit() {
    if (this.userToEdit && this.userToEdit.role) {
      this.newRole = this.userToEdit.role;
    }
  }

  saveRole() {
    // Validamos que no intente enviar sin la clave
    if (!this.newRole || !this.securityKey) {
      this.notify.show('error', 'Debes seleccionar un rol e ingresar tu Security Key.');
      return;
    }

    // Le pasamos la clave al servicio
    this.userService.updateRole(this.userToEdit.id, this.newRole, this.securityKey).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.show('success', 'Rol actualizado correctamente');
          this.onSave.emit();
        } else {
          this.notify.show('error', this.extractErrorMessage(res));
        }
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
    return 'Error al cambiar el rol. Verifica tu Security Key o tus permisos.';
  }
}
