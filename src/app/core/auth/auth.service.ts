import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiService } from '../http/api.service';
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  ChangePasswordRequest,
} from './auth.model';
import { GenericResponse } from '../http/http.models';
import { API_ROUTES } from '../../routes';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  public authChanged = new Subject<void>();
  public openAuthModal = new Subject<'login' | 'register'>();
  public authModalNotice = signal<string>('');
  private readonly authReturnPathKey = 'novasplay_auth_return_path';
  private readonly googleReturnPathKey = 'novasplay_google_return_path';

  openAuth(mode: 'login' | 'register', notice: string = '', returnPath?: string) {
    this.authModalNotice.set(notice);
    this.setAuthReturnPath(returnPath, !!notice);
    this.openAuthModal.next(mode);
  }

  clearAuthModalNotice() {
    this.authModalNotice.set('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.authReturnPathKey);
    }
  }

  consumeAuthReturnPath(): string {
    if (typeof window === 'undefined') return '';

    const savedPath = localStorage.getItem(this.authReturnPathKey);
    localStorage.removeItem(this.authReturnPathKey);
    return savedPath ? this.normalizeReturnPath(savedPath) : '';
  }

  hasSession(): boolean {
    if (typeof window === 'undefined') return false;

    const tokenClaims = localStorage.getItem('CookieTokenClaims');
    const legacyToken = localStorage.getItem('token');
    const hasCookie = typeof document !== 'undefined' && document.cookie.includes('CookieTokenClaims=');

    return !!(tokenClaims || legacyToken || hasCookie);
  }

  register(data: RegisterRequest): Observable<GenericResponse<AuthResponse>> {
    return this.api.post<GenericResponse<AuthResponse>>(API_ROUTES.access.register, data);
  }

  login(data: LoginRequest): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.access.login, data);
  }

  refreshSession(): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.access.refresh, {});
  }

  logout(): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.access.logout, {});
  }

  forgotPassword(email: string): Observable<any> {
    return this.api.post(API_ROUTES.access.passwordForgot, JSON.stringify(email));
  }

  loginWithGoogle(returnPath?: string): void {
    if (typeof window === 'undefined') return;

    const pendingPath = localStorage.getItem(this.authReturnPathKey);
    const targetPath = this.normalizeReturnPath(returnPath || pendingPath || this.getCurrentPath()) || '/';

    if (targetPath !== '/') {
      localStorage.setItem(this.authReturnPathKey, targetPath);
    } else {
      localStorage.removeItem(this.authReturnPathKey);
    }

    localStorage.setItem(this.googleReturnPathKey, targetPath);
    window.location.href = this.api.buildUrl(API_ROUTES.access.googleLogin);
  }

  consumeGoogleReturnPath(): string {
    if (typeof window === 'undefined') return '/';

    const googlePath = localStorage.getItem(this.googleReturnPathKey);
    const authPath = localStorage.getItem(this.authReturnPathKey);
    localStorage.removeItem(this.googleReturnPathKey);
    localStorage.removeItem(this.authReturnPathKey);
    return this.normalizeReturnPath(googlePath || authPath || '/') || '/';
  }

  resetPassword(code: string): Observable<any> {
    return this.api.post(API_ROUTES.access.passwordReset, JSON.stringify(code));
  }

  setLostPassword(password: string): Observable<any> {
    return this.api.post(API_ROUTES.access.passwordSetLost, JSON.stringify(password));
  }

  changePassword(data: ChangePasswordRequest): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.access.passwordChange, data);
  }

  private setAuthReturnPath(returnPath: string | undefined, useCurrentWhenMissing: boolean) {
    if (typeof window === 'undefined') return;

    const targetPath = this.normalizeReturnPath(returnPath || (useCurrentWhenMissing ? this.getCurrentPath() : ''));
    if (targetPath && targetPath !== '/') {
      localStorage.setItem(this.authReturnPathKey, targetPath);
    } else {
      localStorage.removeItem(this.authReturnPathKey);
    }
  }

  private getCurrentPath(): string {
    if (typeof window === 'undefined') return '/';
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  private normalizeReturnPath(value: string | null | undefined): string {
    if (!value) return '';

    let target = String(value).trim();
    try {
      if (/^https?:\/\//i.test(target) && typeof window !== 'undefined') {
        const url = new URL(target);
        if (url.origin !== window.location.origin) return '';
        target = `${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      return '';
    }

    if (!target.startsWith('/') || target.startsWith('//')) return '';
    if (target.toLowerCase().startsWith('/access/google/callback')) return '';
    return target;
  }
}