import { providePrimeNG } from 'primeng/config';
import { NeoPrimePreset } from './shared/theme/neo-primeng-theme';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()), 
    provideClientHydration(withEventReplay()),
    { provide: LOCALE_ID, useValue: 'es-VE' },
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { dateFormat: 'dd/MM/yyyy' } },
    providePrimeNG({
      ripple: true,
      theme: {
        preset: NeoPrimePreset
      }
    })
  ]
};
