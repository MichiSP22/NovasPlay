import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main>
      <p>NovasPlay · Error 404</p>
      <h1>Esta página no existe.</h1>
      <p>Revisa la dirección o vuelve al catálogo para encontrar tu recarga.</p>
      <nav aria-label="Continuar en NovasPlay">
        <a routerLink="/">Ir al inicio</a>
        <a routerLink="/catalogo">Ver catálogo</a>
      </nav>
    </main>
  `,
  styles: `
    main { max-width: 48rem; min-height: 45vh; margin: auto; padding: 4rem 1.5rem; }
    h1 { margin: 1rem 0; }
    nav { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1.5rem; }
    a { color: var(--primary-300, #e7c873); }
  `,
})
export class NotFoundComponent {}
