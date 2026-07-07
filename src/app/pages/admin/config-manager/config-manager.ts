import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyConfigService } from '../../../entities/company-config';
import { NotificationService } from '../../../shared/ui/toast/notification.service';

@Component({
  selector: 'app-config-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './config-manager.html',
  styleUrl: './config-manager.css',
})
export class ConfigManagerComponent implements OnInit {
  private configService = inject(CompanyConfigService);
  private notificationService = inject(NotificationService);

  loading = signal<boolean>(false);
  maintenanceStatus = signal<boolean>(false);
  configAvailable = this.configService.configAvailable;
  configLoadMessage = this.configService.configLoadMessage;

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    this.loading.set(true);
    this.configService.getConfig(true).subscribe({
      next: (res) => {
        this.maintenanceStatus.set(this.configService.isMaintenanceEnabled(res.value || {}));
        this.loading.set(false);
      },
      error: (err) => {
        this.configAvailable.set(false);
        this.configLoadMessage.set(this.extractErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  toggleMaintenance() {
    if (!this.configAvailable()) {
      this.notificationService.show('error', 'No se pudo conectar con la configuracion.');
      return;
    }

    const newVal = !this.maintenanceStatus();
    this.loading.set(true);

    this.configService.upsertConfig({ Mantenimiento: newVal }).subscribe({
      next: (res) => {
        if (res.success) {
          this.maintenanceStatus.set(newVal);
          this.notificationService.show('success', `Mantenimiento ${newVal ? 'activado' : 'desactivado'}`);
        } else {
          this.notificationService.show('error', 'Error al actualizar el estado');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.configAvailable.set(false);
        this.configLoadMessage.set(this.extractErrorMessage(err));
        this.notificationService.show('error', 'No se pudo actualizar la configuracion.');
        this.loading.set(false);
      },
    });
  }

  private extractErrorMessage(error: any): string {
    const payload = error?.error ?? error;
    if (typeof payload?.response === 'string' && payload.response.trim()) return payload.response.trim();
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
    if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
    return 'No se pudo conectar con la configuracion.';
  }
}
