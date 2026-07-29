import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { NotificationService } from '../../shared/ui/toast/notification.service';
import { AuthService } from '../auth/auth.service';
import { API_ROUTES } from '../../routes';

const appStartTime = Date.now();

function normalizePayload(value: any): any {
  let data = value?.error ?? value;

  if (typeof data === 'string') {
    const text = data.trim();
    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
      try {
        return JSON.parse(text);
      } catch {
        return data;
      }
    }
  }

  return data;
}

function isGenericBackendWord(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'error' || normalized === 'errors' || normalized === 'fail' || normalized === 'failed';
}

function readErrors(errors: any): string {
  if (!errors) return '';

  if (typeof errors === 'string') return errors.trim();

  if (Array.isArray(errors)) {
    for (const item of errors) {
      const message = getErrorMessage(item);
      if (message) return message;
    }
    return '';
  }

  if (typeof errors === 'object') {
    for (const key of Object.keys(errors)) {
      const message = readErrors(errors[key]);
      if (message) return message;
    }
  }

  return '';
}

function getErrorMessage(err: any): string {
  const data = normalizePayload(err);

  if (!data) return '';

  if (typeof data === 'string') return data.trim();

  if (Array.isArray(data)) return readErrors(data);

  if (typeof data === 'object') {
    const errorsMessage = readErrors(data.errors);
    if (errorsMessage) return errorsMessage;

    const valueMessage = data.value?.message || data.Value?.Message;
    if (typeof valueMessage === 'string' && valueMessage.trim()) return valueMessage.trim();

    if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();

    if (typeof data.response === 'string' && data.response.trim() && !isGenericBackendWord(data.response)) {
      return data.response.trim();
    }

    if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();
  }

  return '';
}

function isFailedApiBody(body: any): boolean {
  if (!body || typeof body !== 'object') return false;

  if (body.success === false) return true;
  if (typeof body.statusCode === 'number' && body.statusCode >= 400) return true;
  if (readErrors(body.errors)) return true;

  if (typeof body.response === 'string' && isGenericBackendWord(body.response) && !body.value) {
    return true;
  }

  return false;
}

function hasLoginToken(body: any): boolean {
  if (!body) return false;
  if (typeof body === 'string') return body.trim().length > 0;
  if (typeof body !== 'object' || isFailedApiBody(body)) return false;

  const token = body.value ?? body.token ?? body.accessToken;
  return typeof token === 'string' && token.trim().length > 0;
}
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);
  const router = inject(Router);
  const authService = inject(AuthService);

  const silentEndpoints = [
    API_ROUTES.access.refresh.toLowerCase(),
    API_ROUTES.user.me.toLowerCase(),
  ];

  const reqUrlLower = (req.url || '').toLowerCase();
  const ignoreNotification = silentEndpoints.some((url) => reqUrlLower.includes(url));
  const isAccessRequest = reqUrlLower.includes('/access/');
  const isLoginRequest =
    reqUrlLower.includes(API_ROUTES.access.login.toLowerCase()) &&
    !reqUrlLower.includes(API_ROUTES.access.googleLogin.toLowerCase());

  return next(req).pipe(
    tap((event) => {
      if (!(event instanceof HttpResponse) || (event.status !== 200 && event.status !== 201)) return;
      if (ignoreNotification) return;

      const body = event.body as any;
      if (isLoginRequest) {
        if (hasLoginToken(body)) {
          notify.show('success', 'Bienvenido a NovasPlay.', true);
        }
        return;
      }

      if (typeof body?.message === 'string' && body.message.trim()) {
        notify.show('success', body.message.trim());
      }
    }),
    catchError((error) => {
      if (ignoreNotification) {
        return throwError(() => error);
      }

      const isCloudflareTimeout = error?.status === 522;
      const isBackgroundOrStartupRequest =
        req.method === 'GET' || req.method === 'HEAD' || Date.now() - appStartTime < 15000;
      if (isCloudflareTimeout && isBackgroundOrStartupRequest) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        if (isLoginRequest) {
          const loginMsg = getErrorMessage(error) || 'Usuario o contrasena incorrectos.';
          notify.show('error', loginMsg, true);
        } else {
          const currentUrl = router.url || '';
          const isCheckoutFlow = currentUrl.includes('/checkout') || currentUrl.includes('/cart-checkout');

          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('CookieTokenClaims');
          }

          if (isCheckoutFlow) {
            authService.openAuth(
              'login',
              'Tu sesion expiro. Inicia sesion de nuevo para continuar con esta compra sin perder el carrito.'
            );
          } else {
            const msg = getErrorMessage(error) || 'Tu sesion expiro. Inicia sesion nuevamente.';
            notify.show('warning', msg, true);
            router.navigate(['/']);
          }
        }
        return throwError(() => error);
      }

      if (error.status === 403) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('CookieTokenClaims');
        }
        const forbiddenMsg =
          getErrorMessage(error) ||
          'Acceso denegado. Tu cuenta puede estar bloqueada o baneada, por favor contacta con un administrador.';
        notify.show('error', forbiddenMsg, true);
        router.navigate(['/']);
        return throwError(() => error);
      }

      if (error.status === 429) {
        const retryAfterRaw = error?.headers?.get?.('Retry-After');
        const retryAfterSeconds = Number.parseInt(retryAfterRaw ?? '', 10);
        const waitHint = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? ` Por favor, espera ${retryAfterSeconds} segundos antes de volver a intentar y evita recargar varias veces seguidas.`
          : ' Por favor, espera un momento antes de volver a intentar y evita recargar varias veces seguidas.';
        notify.show('warning', `Estas intentando consultar demasiadas veces en muy poco tiempo.${waitHint}`, true);
        return throwError(() => error);
      }

      if (error.status >= 500) {
        let snippet = getErrorMessage(error) || '';
        if (typeof snippet === 'string' && snippet.length > 0) {
          snippet = snippet.replace(/<[^>]*>?/gm, '').trim().split('\n')[0].substring(0, 50);
        }
        const msg = snippet
          ? `Ocurrio un error. Por favor intenta de nuevo. (${snippet}...)`
          : 'Ocurrio un error. Por favor intenta de nuevo.';
        notify.show('error', msg);
        return throwError(() => error);
      }

      let finalMessage = getErrorMessage(error) || 'Ocurrio un error';
      if (typeof finalMessage === 'string' && finalMessage.length > 200) {
        finalMessage = finalMessage.replace(/<[^>]*>?/gm, '').trim().split('\n')[0].substring(0, 80) + '...';
      }

      if (finalMessage) {
        notify.show('error', finalMessage.toString(), isAccessRequest);
      }

      return throwError(() => error);
    })
  );
};
