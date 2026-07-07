import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
 
  private toastsSignal = signal<Toast[]>([]);
  private startTime = Date.now();
  private nextToastId = 1;
  private toastTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private toastRemaining = new Map<number, number>();
  private toastStartedAt = new Map<number, number>();
  
 
  public toasts = this.toastsSignal.asReadonly();

  show(type: 'success' | 'error' | 'warning', message: string, force: boolean = false, duration: number = 4000) {
    // Si estamos en los primeros 3 segundos de carga de la aplicación,
    // ignoramos cualquier notificación para evitar parpadeos de errores iniciales.
    if (!force && Date.now() - this.startTime < 3000) return;

    const newToast: Toast = { id: this.nextToastId++, type, message, duration };
    
    
    this.toastsSignal.update(all => [...all, newToast]);
    this.startAutoClose(newToast.id, duration);
  }

  pauseToast(toastId: number) {
    const timer = this.toastTimers.get(toastId);
    if (!timer) return;

    clearTimeout(timer);
    this.toastTimers.delete(toastId);

    const startedAt = this.toastStartedAt.get(toastId) ?? Date.now();
    const remaining = this.toastRemaining.get(toastId) ?? 0;
    const elapsed = Date.now() - startedAt;
    this.toastRemaining.set(toastId, Math.max(0, remaining - elapsed));
  }

  resumeToast(toastId: number) {
    if (this.toastTimers.has(toastId)) return;

    const remaining = this.toastRemaining.get(toastId);
    if (remaining === undefined) return;

    this.startAutoClose(toastId, remaining);
  }

  private startAutoClose(toastId: number, delayMs: number) {
    this.toastRemaining.set(toastId, delayMs);
    this.toastStartedAt.set(toastId, Date.now());

    const timer = setTimeout(() => {
      this.removeToast(toastId);
    }, delayMs);
    this.toastTimers.set(toastId, timer);
  }

  private removeToast(toastId: number) {
    const timer = this.toastTimers.get(toastId);
    if (timer) clearTimeout(timer);
    this.toastTimers.delete(toastId);
    this.toastRemaining.delete(toastId);
    this.toastStartedAt.delete(toastId);
    this.toastsSignal.update(all => all.filter(t => t.id !== toastId));
  }
}
