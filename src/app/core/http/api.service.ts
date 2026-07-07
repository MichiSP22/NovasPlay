import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);

  private env = environment as Record<string, unknown>;

  private normalizePath(value: string): string {
    return (value || '').replace(/^\/+|\/+$/g, '');
  }

  private getEnvString(key: string): string {
    const value = this.env[key];
    return typeof value === 'string' ? value : '';
  }

  private getApiUrlOverride(): string {
    const directApiUrl = this.getEnvString('apiUrl') || this.getEnvString('API_URL');
    return (directApiUrl || '').trim().replace(/\/+$/g, '');
  }

  private getApiBase(versionOverride?: string): string {
    const directApiUrl = this.getApiUrlOverride();
    if (directApiUrl && !versionOverride) {
      return directApiUrl;
    }

    const rawBase = (this.getEnvString('apiBaseUrl') || this.getEnvString('API_BASE_URL')).trim();
    const prefix = this.normalizePath(this.getEnvString('apiPrefix') || this.getEnvString('API_PREFIX') || 'api');
    const fallbackVersion = this.getEnvString('apiDefaultVersion') || this.getEnvString('API_DEFAULT_VERSION') || 'v1';
    const envVersion = this.getEnvString('apiVersion') || this.getEnvString('API_VERSION');
    const selectedVersion = versionOverride || envVersion || fallbackVersion;
    const version = this.normalizePath(selectedVersion);

    const parts = [prefix, version].filter(Boolean).join('/');

    if (!rawBase) return parts ? `/${parts}` : '';

    const base = rawBase.replace(/\/+$/g, '');
    return parts ? `${base}/${parts}` : base;
  }

  private resolveUrl(endpoint: string, apiVersion?: string): string {
    const base = this.getApiBase(apiVersion);
    const cleanEndpoint = `/${(endpoint || '').replace(/^\/+/g, '')}`;
    return `${base}${cleanEndpoint}`;
  }

  // Recibe tu elección: 'json' o 'multipart'
  private getHeaders(contentType: 'json' | 'multipart' = 'json'): HttpHeaders {
    let headers = new HttpHeaders();


    // 2. Aplicamos el Content-Type según tu elección
    if (contentType === 'json') {
      headers = headers.set('Content-Type', 'application/json');
    }
    // NOTA CLAVE: Si eliges 'multipart', NO seteamos el Content-Type a mano. 
    // Angular y el navegador deben hacerlo automáticamente para generar el "boundary" (el límite) de los archivos.

    return headers;
  }

  get<T>(endpoint: string, params?: any, responseType: 'json' | 'text' = 'json', apiVersion?: string): Observable<T> {
    return this.http.get<T>(this.resolveUrl(endpoint, apiVersion), {
      headers: this.getHeaders('json'), // Los GET siempre son JSON/Texto, no llevan archivos en el body
      params: params,
      withCredentials: true,
      responseType: responseType as any
    });
  }

  // Agregamos contentType como tercer parámetro (por defecto 'json')
  post<T>(endpoint: string, body: any, contentType: 'json' | 'multipart' = 'json', responseType: 'json' | 'text' = 'json', apiVersion?: string): Observable<T> {
    const isMultipart = contentType === 'multipart';
    return this.http.post<T>(this.resolveUrl(endpoint, apiVersion), body, {
      headers: isMultipart ? undefined : this.getHeaders(contentType),
      withCredentials: true,
      responseType: responseType as any
    });
  }

  put<T>(endpoint: string, body: any, contentType: 'json' | 'multipart' = 'json', responseType: 'json' | 'text' = 'json', apiVersion?: string): Observable<T> {
    const isMultipart = contentType === 'multipart';
    return this.http.put<T>(this.resolveUrl(endpoint, apiVersion), body, {
      headers: isMultipart ? undefined : this.getHeaders(contentType),
      withCredentials: true,
      responseType: responseType as any
    });
  }

  delete<T>(endpoint: string, body?: any, contentType: 'json' | 'multipart' = 'json', responseType: 'json' | 'text' = 'json', apiVersion?: string): Observable<T> {
    const isMultipart = contentType === 'multipart';
    return this.http.request<T>('delete', this.resolveUrl(endpoint, apiVersion), {
      headers: isMultipart ? undefined : this.getHeaders(contentType),
      body: body,
      withCredentials: true,
      responseType: responseType as any
    });
  }



  // Agrega este método a tu ApiService
  patch<T>(endpoint: string, body: any | null, apiVersion?: string): Observable<T> {
    return this.http.patch<T>(this.resolveUrl(endpoint, apiVersion), body, {
      withCredentials: true
    });
  }

  buildUrl(endpoint: string, apiVersion?: string): string {
    return this.resolveUrl(endpoint, apiVersion);
  }

  // Enviar mensaje de contacto
  sendContactMessage(data: { subject: string; message: string }): Observable<any> {
    return this.post<any>('/Contact', data);
  }
}
