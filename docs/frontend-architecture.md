# Arquitectura Frontend - NovasPlay

NovasPlay usa Angular standalone con SSR. La arquitectura recomendada para este proyecto es una variante feature-first inspirada en Feature-Sliced Design, adaptada a Angular:

- `app`: arranque de Angular, configuracion global y rutas raiz.
- `core`: servicios singleton, guards, interceptors, clientes HTTP y configuracion transversal.
- `layout`: componentes de estructura persistente, como header, nav y footer.
- `pages`: componentes usados directamente por rutas.
- `features`: flujos o acciones de usuario reutilizables dentro de paginas.
- `entities`: modelos, contratos y acceso API de cada dominio.
- `shared`: UI generica, pipes, helpers y utilidades sin logica de negocio.

## Estructura objetivo

```txt
src/app/
  app.config.ts
  app.routes.ts

  core/
    http/
      api.service.ts
    auth/
      auth.service.ts
      admin.guard.ts
    interceptors/
      auth.interceptor.ts
      error.interceptor.ts
    platform/
      responsive.service.ts

  layout/
    header/
    nav-bar/
    footer/

  pages/
    home/
    checkout/
    cart-checkout/
    admin/
      dashboard/
      product-manager/
      category-manager/
      order-manager/

  entities/
    product/
      api/
        product.service.ts
      model/
        product.model.ts
      mappers/
        product.mapper.ts
      index.ts
    category/
    order/
    user/
    payment/
    recharge/

  features/
    product/
      create-product/
      edit-product/
      assign-categories/
    auth/
      login/
      register/
      forgot-password/
    cart/
      add-to-cart/
      checkout-cart/

  shared/
    ui/
      modal/
      toast/
      confirm-dialog/
    pipes/
    utils/
    model/
```

## Reglas de dependencia

Las carpetas de arriba pueden importar hacia abajo, pero no hacia arriba:

```txt
app -> pages -> features -> entities -> shared
app -> core
pages -> layout
core -> shared
```

Reglas practicas:

- `shared` no importa dominios como `product`, `order` o `user`.
- `entities/product` no importa `features/product`.
- `features` no deberia llamar endpoints directamente si ya existe un servicio en `entities`.
- `pages` orquesta pantallas: carga datos, compone features y layout.
- `core` contiene lo global de Angular: interceptors, guards, responsive, API base.

## Servicios

Los servicios actuales en `src/app/services` deben migrarse por responsabilidad:

```txt
services/api.service.ts              -> core/http/api.service.ts
services/auth.ts                     -> core/auth/auth.service.ts
guards/admin.guards.ts               -> core/auth/admin.guard.ts
interceptors/*.ts                    -> core/interceptors/
services/responsive.service.ts       -> core/platform/responsive.service.ts
services/product.service.ts          -> entities/product/api/product.service.ts
services/category.service.ts         -> entities/category/api/category.service.ts
services/order.service.ts            -> entities/order/api/order.service.ts
services/cart.service.ts             -> entities/cart/api/cart.service.ts
services/notification.ts             -> shared/ui/toast/notification.service.ts
interfaces/pagination.interface.ts   -> shared/model/pagination.model.ts
interfaces/auth.interface.ts         -> core/auth/auth.model.ts
```

La migracion debe hacerse por modulo/pantalla, no todo de golpe.

## Objetos y modelos

Cada dominio debe tener sus modelos cerca:

```txt
entities/product/model/product.model.ts
entities/product/model/product-search.model.ts
entities/product/model/assign-category.model.ts
```

Ejemplo:

```ts
export interface Product {
  id?: number;
  name: string;
  description: string;
  timeMinRecharge: string;
  timeMaxRecharge: string;
  soldOut: boolean;
  internalProcess?: boolean;
  imageInfo?: ProductImageInfo;
  categoryIds?: number[];
  categories?: string[];
  imageFile?: File;
  iconFile?: File;
}

export interface ProductImageInfo {
  imageURL?: string;
}
```

Si el API devuelve campos en PascalCase (`Id`, `Name`) y la app usa camelCase (`id`, `name`), la conversion va en un mapper:

```txt
entities/product/mappers/product.mapper.ts
```

## Rutas

Mantener `app.routes.ts` como punto de entrada, pero mover rutas grandes a archivos por area.

```txt
src/app/app.routes.ts
src/app/pages/admin/admin.routes.ts
src/app/pages/public/public.routes.ts
```

Ejemplo:

```ts
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./pages/admin/admin.routes').then((m) => m.adminRoutes),
  },
  { path: '**', redirectTo: '' },
];
```

Para Angular standalone, usar `loadComponent` en pantallas individuales y `loadChildren` cuando una seccion tenga varias rutas relacionadas.

## Plan de migracion recomendado

1. Crear carpetas base y documentar reglas.
2. Migrar `core`: `api.service`, interceptors, guards, auth y responsive.
3. Migrar `layout`: `header`, `nav-bar`, `footer`.
4. Migrar una entidad piloto, recomendado `product`.
5. Migrar una pagina piloto, recomendado `product-manager`.
6. Repetir el patron por dominios: category, country, coin, payment, order, recharge, user.

## Convencion para cada nueva funcionalidad

Antes de crear archivos, decidir su tipo:

- Es una pantalla de ruta: `pages/<area>/<screen>`.
- Es una accion reutilizable: `features/<domain>/<action>`.
- Es dato/logica de dominio: `entities/<domain>`.
- Es global de aplicacion: `core`.
- Es UI o utilidad reusable sin negocio: `shared`.

No se toca base de datos desde el frontend. Si una funcionalidad requiere cambios de datos o migraciones, se entregan scripts separados para revision.
