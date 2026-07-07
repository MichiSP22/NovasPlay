import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, tap, catchError, of, map, switchMap, forkJoin } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { SearchRequest } from '../../../core/http/http.models';
import { GenericResponse } from '../../../core/http/http.models';
import { UpdateProfilePayload, User } from '../model/user.model';
import { mapUserApiItem } from '../mappers/user.mapper';
import { API_ROUTES } from '../../../routes';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private api = inject(ApiService);
  private userCache$: Observable<GenericResponse<User>> | null = null;
  private allUsersCache$: Observable<User[]> | null = null;
  private supportUsersCache$: Observable<User[]> | null = null;

  search(searchParams: SearchRequest): Observable<GenericResponse<any>> {
    const params: any = { 
      'Pagination.PageNumber': (searchParams.pageNumber || 1).toString(), 
      'Pagination.PageSize': (searchParams.pageSize || 10).toString(), 
      'Select': ['UserID', 'FirstName', 'LastName', 'LoginInfo_Email', 'Birth', 'Role', 'Phone', 'LoginInfo_Status']
    };
    
    if (searchParams.orderByField) {
      params['OrderBy.Field'] = searchParams.orderByField;
      params['OrderBy.Ascending'] = searchParams.orderByAscending;
    }

    const allFilters: any[] = [];
    if (searchParams.filters && searchParams.filters.length > 0) {
      searchParams.filters.forEach((filter) => {
        allFilters.push({
          Field: filter.field,
          Operator: filter.operator,
          Value: filter.value
        });
      });
    }

    if (allFilters.length > 0) {
      params['Filters'] = JSON.stringify(allFilters);
    }


    return this.api.get<GenericResponse<any>>(API_ROUTES.user.search, params);
  }

  /**
   * Obtiene TODOS los usuarios (paginando internamente) y los cachea.
   * Solo hace las llamadas HTTP la primera vez; después devuelve el caché.
   */
  getAllUsers(): Observable<User[]> {
    if (!this.allUsersCache$) {
      this.allUsersCache$ = this.search({ pageNumber: 1, pageSize: 100, filters: [] }).pipe(
        switchMap(firstRes => {
          const firstItems = firstRes?.value?.items || [];
          const totalPages = firstRes?.value?.totalPages || 1;
          const mapped = this.mapRawUsers(firstItems);

          if (totalPages <= 1) {
            return of(mapped);
          }

          // Traer páginas restantes en paralelo
          const remaining: Observable<GenericResponse<any>>[] = [];
          for (let p = 2; p <= totalPages; p++) {
            remaining.push(this.search({ pageNumber: p, pageSize: 100, filters: [] }));
          }

          return forkJoin(remaining).pipe(
            map(responses => {
              responses.forEach(r => {
                if (r?.success && r.value) {
                  mapped.push(...this.mapRawUsers(r.value.items || []));
                }
              });
              return mapped;
            })
          );
        }),
        shareReplay(1),
        catchError(() => {
          this.allUsersCache$ = null;
          return of([]);
        })
      );
    }
    return this.allUsersCache$;
  }

  /**
   * Devuelve los usuarios con rol Support.
   * Cacheado con shareReplay(1): las peticiones HTTP se hacen UNA SOLA VEZ por sesión.
   * Intentra filtrar en el servidor primero; si el backend lo ignora, usa getAllUsers() como respaldo.
   */
  getSupportUsers(): Observable<User[]> {
    if (!this.supportUsersCache$) {
      this.supportUsersCache$ = this.search({
        pageNumber: 1,
        pageSize: 100,
        filters: [{ field: 'Role', operator: 0, value: 'Support' }]
      }).pipe(
        switchMap(res => {
          const items = res?.value?.items || [];
          const mapped = this.mapRawUsers(items);

          // Si el servidor devolvió resultados y todos son Support, el filtro funcionó
          const filterWorked = mapped.length > 0 && mapped.every(u => (u.role || '').toLowerCase() === 'support');

          if (filterWorked || (res?.value?.totalItems === 0)) {
            return of(mapped);
          }

          // Respaldo: reutilizamos el caché de getAllUsers() — sin peticiones nuevas
          return this.getAllUsers().pipe(
            map(users => users.filter(u => (u.role || '').toLowerCase() === 'support'))
          );
        }),
        shareReplay(1),
        catchError(() => {
          this.supportUsersCache$ = null;
          return of([]);
        })
      );
    }
    return this.supportUsersCache$;
  }

  private mapRawUsers(items: any[]): User[] {
    return items.map(item => mapUserApiItem(item));
  }

  getMe(): Observable<GenericResponse<User>> {
    if (!this.userCache$) {
      this.userCache$ = this.api.get<GenericResponse<User>>(API_ROUTES.user.me).pipe(
        shareReplay(1),
        catchError(err => {
          this.userCache$ = null; // No cachear errores
          throw err;
        })
      );
    }
    return this.userCache$;
  }

  updateMe(payload: UpdateProfilePayload): Observable<GenericResponse<string>> {
    const formData = new FormData();
    formData.append('FirstName', payload.firstName);
    formData.append('LastName', payload.lastName);
    formData.append('Phone', payload.phone);
    formData.append('Birth', payload.birth);
    formData.append('Observation', payload.observation);

    // Ya no mandamos la imagen aquí por petición del usuario
    // if (payload.imageFile) formData.append('ImageInfo.Image', payload.imageFile);
    // if (payload.iconFile) formData.append('ImageInfo.Icon', payload.iconFile);

    return this.api.put<GenericResponse<string>>(API_ROUTES.user.me, formData, 'multipart').pipe(
      tap(res => {
        if (res.success) this.userCache$ = null; // Invalidar cache para refrescar datos
      })
    );
  }

  updateMyImage(file: File): Observable<GenericResponse<string>> {
    const formData = new FormData();
    // Según FromForm IFormFile, usualmente la clave es coincidente con el parámetro en el backend
    // Si no se especifica, probamos con "file" o "Image"
    formData.append('Image', file); 
    return this.api.patch<GenericResponse<string>>(API_ROUTES.user.meImage, formData).pipe(
      tap(res => {
        if (res.success) this.userCache$ = null; // Invalidar cache para refrescar imagen
      })
    );
  }

  // Endpoints para Baneo/Desbaneo
  banUser(userId: string): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.user.ban(userId));
  }

  unbanUser(userId: string): Observable<GenericResponse<string>> {
    return this.api.patch<GenericResponse<string>>(API_ROUTES.user.unban(userId), {});
  }

  // Endpoints para Rol de Soporte
  assignSupport(userId: string): Observable<GenericResponse<string>> {
    return this.api.patch<GenericResponse<string>>(API_ROUTES.user.support(userId), {});
  }

  removeSupport(userId: string): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.user.support(userId));
  }

  // PATCH para cambiar el rol (Solo para Root/Admin)
  updateRole(userId: string, newRole: string, securityKey: string): Observable<GenericResponse<string>> {
    const payload = { 
      role: newRole, 
      securityKey: securityKey 
    };
    return this.api.patch<GenericResponse<string>>(API_ROUTES.user.role(userId), payload);
  }
}
