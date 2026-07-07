import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  private platformId = inject(PLATFORM_ID);
  
  // Flag para saber si estamos en el navegador
  isBrowser = isPlatformBrowser(this.platformId);
  
  // Signal para el ancho de pantalla (default PC en servidor)
  screenWidth = signal<number>(this.isBrowser ? window.innerWidth : 1200);

  constructor() {
    if (this.isBrowser) {
      window.addEventListener('resize', () => {
        this.screenWidth.set(window.innerWidth);
      });
    }
  }

  /**
   * Ejecuta una función solo si estamos en el navegador.
   * Útil para manipular el DOM o usar objetos como window/document.
   */
  run(fn: () => void) {
    if (this.isBrowser) {
      fn();
    }
  }
}
