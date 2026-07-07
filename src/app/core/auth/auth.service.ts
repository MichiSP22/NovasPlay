import { Injectable, inject } from '@angular/core';
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

  
  
// PASO 1: Enviar correo
  forgotPassword(email: string): Observable<any> {
   
    return this.api.post(API_ROUTES.access.passwordForgot, JSON.stringify(email));
  }

  // Google Login
  loginWithGoogle(): void {
    window.location.href = this.api.buildUrl(API_ROUTES.access.googleLogin);
  }

  // PASO 2: Validar el código
  resetPassword(code: string): Observable<any> {
    return this.api.post(API_ROUTES.access.passwordReset, JSON.stringify(code));
  }

  // PASO 3: Nueva contraseña
  setLostPassword(password: string): Observable<any> {
    return this.api.post(API_ROUTES.access.passwordSetLost, JSON.stringify(password));
  }

  changePassword(data: ChangePasswordRequest): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.access.passwordChange, data);
  }
}
