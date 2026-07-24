import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { NotificationService } from '../../shared/ui/toast/notification.service';
import { AuthService } from '../auth/auth.service';
import { API_ROUTES } from '../../routes';

const appStartTime = Date.now();

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);
  const router = inject(Router);
  const authService = inject(AuthService);

  // NUEVO: 1. Define un arreglo con los fragmentos de URL que quieres ignorar
  const endpointsSilenciosos = [
    API_ROUTES.access.refresh.toLowerCase(),
    API_ROUTES.user.me.toLowerCase()
  ];

  // NUEVO: 2. Verifica si la petición actual incluye alguno de esos endpoints
  const reqUrlLower = (req.url || '').toLowerCase();
  const ignorarNotificacion = endpointsSilenciosos.some(url => reqUrlLower.includes(url));

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && (event.status === 200 || event.status === 201)) {
        
        // NUEVO: 3. Si es un endpoint silencioso, no hace nada y sigue su camino
        if (ignorarNotificacion) return;

        if (req.url.includes('/Access/Login')) {
          notify.show('success', '¡Bienvenido!');
        } else if ((event.body as any)?.message) {
          notify.show('success', (event.body as any).message);
        }
      }
    }),
    catchError((error) => {
      // NUEVO: 4. Si es un endpoint silencioso, lanzamos el error para que el componente 
      // lo maneje si quiere, pero NO mostramos la notificación global.
      if (ignorarNotificacion) {
        return throwError(() => error);
      }

      // Función auxiliar para extraer el mensaje de error de forma robusta
      const getErrorMessage = (err: any): string => {
        let data = err?.error || err;
        
        // Si es un string que parece un objeto o array JSON, intentamos parsearlo
        if (typeof data === 'string' && (data.trim().startsWith('{') || data.trim().startsWith('['))) {
          try {
            data = JSON.parse(data);
          } catch (e) {}
        }

        // Si es un string directo, lo devolvemos
        if (typeof data === 'string') return data;

        // Si es un array, tomamos el primer elemento (común en errores de validación)
        if (Array.isArray(data) && data.length > 0) {
          const first = data[0];
          return typeof first === 'string' ? first : getErrorMessage(first);
        }

        // Si es un objeto, buscamos propiedades comunes de error
        if (typeof data === 'object' && data !== null) {
          // Contrato GenericResponse del backend
          if (typeof data.response === 'string' && data.response.trim()) {
            return data.response;
          }

          if (Array.isArray(data.errors) && data.errors.length > 0) {
            const firstError = data.errors.find((item: unknown) => typeof item === 'string' && item.trim());
            if (firstError) return firstError;
          }

          // .message es el más estándar
          if (data.message) return data.message;
          
          // .errors suele contener un objeto con arrays de validación o un array directo
          if (data.errors) {
            if (Array.isArray(data.errors) && data.errors.length > 0) {
              return typeof data.errors[0] === 'string' ? data.errors[0] : getErrorMessage(data.errors[0]);
            }
            if (typeof data.errors === 'object') {
              const firstKey = Object.keys(data.errors)[0];
              if (firstKey && Array.isArray(data.errors[firstKey]) && data.errors[firstKey].length > 0) {
                return data.errors[firstKey][0];
              }
            }
            if (typeof data.errors === 'string') return data.errors;
          }
          
          // .title se usa en algunos errores de ASP.NET Core
          if (data.title) return data.title;
        }
        
        return '';
      };

      // 401: Si viene del Login, mostramos el error al usuario.
      if (error.status === 401) {
        if (req.url.includes('/Access/Login')) {
          const loginMsg = getErrorMessage(error) || 'Usuario o contrasena incorrectos';
          notify.show('error', loginMsg, true);
        } else {
          const currentUrl = router.url || '';
          const isCheckoutFlow = currentUrl.includes('/checkout') || currentUrl.includes('/cart-checkout');

          if (isCheckoutFlow) {
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('CookieTokenClaims');
            }
            authService.openAuth('login', 'Tu sesion expiro. Inicia sesion de nuevo para continuar con esta compra sin perder el carrito.');
          } else {
            router.navigate(['/']);
          }
        }
        return throwError(() => error);
      }
      // 403: Cuenta inactiva, bloqueada o baneada
      if (error.status === 403) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('CookieTokenClaims');
        }
        const forbiddenMsg = getErrorMessage(error) || 'Acceso denegado. Tu cuenta puede estar bloqueada o baneada, por favor contacte con un administrador.';
        notify.show('error', forbiddenMsg, true);
        router.navigate(['/']);
        return throwError(() => error);
      }

      // 429: Demasiadas solicitudes al mismo endpoint (spam)
      if (error.status === 429) {
        const retryAfterRaw = error?.headers?.get?.('Retry-After');
        const retryAfterSeconds = Number.parseInt(retryAfterRaw ?? '', 10);
        const waitHint = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? ` Por favor, espera ${retryAfterSeconds} segundos antes de volver a intentar y evita recargar varias veces seguidas.`
          : ' Por favor, espera un momento antes de volver a intentar y evita recargar varias veces seguidas.';
        notify.show('warning', `Estás intentando consultar demasiadas veces en muy poco tiempo.${waitHint}`, true);
        return throwError(() => error);
      }

      // 500+: Error interno del servidor — nunca mostrar mensajes técnicos al usuario completos
      if (error.status >= 500) {
        let snippet = getErrorMessage(error) || '';
        if (typeof snippet === 'string' && snippet.length > 0) {
          snippet = snippet.replace(/<[^>]*>?/gm, '').trim().split('\n')[0].substring(0, 50);
        }
        const msg = snippet 
          ? `Ocurrió un error. Por favor intenta de nuevo. (${snippet}...)`
          : 'Ocurrió un error. Por favor intenta de nuevo.';
        notify.show('error', msg);
        return throwError(() => error);
      }

      // Para otros errores (400, 422, etc.) mostramos el mensaje del backend
      let finalMessage = getErrorMessage(error) || 'Ocurrió un error';
      if (typeof finalMessage === 'string' && finalMessage.length > 200) {
        finalMessage = finalMessage.replace(/<[^>]*>?/gm, '').trim().split('\n')[0].substring(0, 80) + '...';
      }
      
      if (finalMessage) {
        notify.show('error', finalMessage.toString());
      }

      return throwError(() => error);
    })
  );
};
