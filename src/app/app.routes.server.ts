import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'terms-view',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'checkout/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'cart-checkout',
    renderMode: RenderMode.Server
  },
  {
    path: 'admin',
    renderMode: RenderMode.Client
  },
  {
    path: 'profile',
    renderMode: RenderMode.Client
  },
  {
    path: 'Access/Google/Callback',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
