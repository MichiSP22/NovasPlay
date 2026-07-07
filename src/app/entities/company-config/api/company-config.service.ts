import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { GenericResponse } from '../../../core/http/http.models';
import { CompanyConfigMap } from '../model/company-config.model';
import { API_ROUTES } from '../../../routes';

@Injectable({
  providedIn: 'root',
})
export class CompanyConfigService {
  private api = inject(ApiService);
  private configRequest$?: Observable<GenericResponse<CompanyConfigMap>>;

  maintenanceMode = signal<boolean>(false);
  configAvailable = signal<boolean>(true);
  configLoadMessage = signal<string>('');

  getConfig(force = false): Observable<GenericResponse<CompanyConfigMap>> {
    if (!force && this.configRequest$) return this.configRequest$;

    this.configAvailable.set(true);
    this.configLoadMessage.set('');

    this.configRequest$ = this.api.get<any>(API_ROUTES.companyConfig.root).pipe(
      map(res => this.normalizeConfigResponse(res)),
      tap(res => {
        if (!res.success) {
          this.configAvailable.set(false);
          this.configLoadMessage.set(res.errors?.join(' | ') || res.response || 'No se pudo cargar la configuracion.');
          this.maintenanceMode.set(false);
          return;
        }

        this.maintenanceMode.set(this.isMaintenanceEnabled(res.value || {}));
      }),
      catchError((error) => {
        this.configRequest$ = undefined;
        this.configAvailable.set(false);
        this.configLoadMessage.set(this.extractErrorMessage(error));
        this.maintenanceMode.set(false);
        return of(this.createConfigResponse({}));
      }),
      shareReplay(1)
    );

    return this.configRequest$;
  }

  upsertConfig(config: CompanyConfigMap): Observable<GenericResponse<string>> {
    return this.api.put<any>(API_ROUTES.companyConfig.root, config).pipe(
      map(res => this.normalizeWriteResponse(res)),
      tap(res => {
        if (res.success) {
          this.configRequest$ = undefined;
          this.configAvailable.set(true);
          this.configLoadMessage.set('');
          this.maintenanceMode.set(this.isMaintenanceEnabled(config));
        }
      })
    );
  }

  deleteKeys(keys: string[]): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.companyConfig.root, keys).pipe(
      tap(res => {
        if (res.success) this.configRequest$ = undefined;
      })
    );
  }

  isMaintenanceEnabled(config: CompanyConfigMap): boolean {
    const value = this.getFirstConfigValue(config, [
      'Mantenimiento',
      'maintenance',
      'Maintenance',
      'maintenanceMode',
      'MaintenanceMode',
      'modoMantenimiento',
    ]);

    return this.coerceBoolean(value);
  }

  private normalizeConfigResponse(payload: any): GenericResponse<CompanyConfigMap> {
    const value = this.extractConfigMap(payload);
    const success = payload?.success ?? payload?.Success;

    return {
      success: success === undefined ? true : this.coerceBoolean(success),
      response: payload?.response ?? payload?.Response ?? '',
      statusCode: Number(payload?.statusCode ?? payload?.StatusCode ?? 200),
      value,
      errors: Array.isArray(payload?.errors ?? payload?.Errors) ? (payload.errors ?? payload.Errors) : [],
    };
  }

  private normalizeWriteResponse(payload: any): GenericResponse<string> {
    const success = payload?.success ?? payload?.Success;
    const value = payload?.value ?? payload?.Value ?? payload?.response ?? payload?.Response ?? '';

    return {
      success: success === undefined ? true : this.coerceBoolean(success),
      response: payload?.response ?? payload?.Response ?? '',
      statusCode: Number(payload?.statusCode ?? payload?.StatusCode ?? 200),
      value: typeof value === 'string' ? value : '',
      errors: Array.isArray(payload?.errors ?? payload?.Errors) ? (payload.errors ?? payload.Errors) : [],
    };
  }

  private createConfigResponse(value: CompanyConfigMap): GenericResponse<CompanyConfigMap> {
    return {
      success: true,
      response: '',
      statusCode: 200,
      value,
      errors: [],
    };
  }

  private extractConfigMap(payload: any): CompanyConfigMap {
    const raw = payload?.value ?? payload?.Value ?? payload?.configuration ?? payload?.Configuration ?? payload;

    if (!raw) return {};

    if (Array.isArray(raw)) {
      return this.arrayToConfigMap(raw);
    }

    if (Array.isArray(raw.items ?? raw.Items)) {
      return this.arrayToConfigMap(raw.items ?? raw.Items);
    }

    if (typeof raw === 'object') {
      return raw as CompanyConfigMap;
    }

    return {};
  }

  private arrayToConfigMap(items: any[]): CompanyConfigMap {
    return items.reduce((config, item) => {
      const key = item?.key ?? item?.Key ?? item?.name ?? item?.Name;
      if (!key) return config;

      config[key] = item?.value ?? item?.Value ?? item?.content ?? item?.Content ?? item?.data ?? item?.Data;
      return config;
    }, {} as CompanyConfigMap);
  }

  private getFirstConfigValue(config: CompanyConfigMap, keys: string[]): any {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(config, key)) {
        return config[key];
      }
    }
    return undefined;
  }

  private coerceBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'si', 'on', 'activo', 'active'].includes(value.trim().toLowerCase());
    }
    return false;
  }

  private extractErrorMessage(error: any): string {
    const payload = error?.error ?? error;
    if (typeof payload?.response === 'string' && payload.response.trim()) return payload.response.trim();
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
    if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
    return 'No se pudo cargar la configuracion.';
  }
}
