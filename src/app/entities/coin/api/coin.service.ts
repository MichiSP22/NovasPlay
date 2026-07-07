import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GenericResponse } from '../../../core/http/http.models';
import { PaginatedList } from '../../../shared/model/pagination.model';
import { SearchRequest } from '../../../core/http/http.models';
import { ApiService } from '../../../core/http/api.service';
import { Coin } from '../model/coin.model';
import { API_ROUTES } from '../../../routes';


@Injectable({
  providedIn: 'root',
})


export class CoinService { 
   
  private api = inject(ApiService);

  search(criteria: Partial<SearchRequest> = {}): Observable<GenericResponse<PaginatedList<Coin[]>>> {
    const params: any = {
      'Pagination.PageNumber': (criteria.pageNumber || 1).toString(),
      'Pagination.PageSize': (criteria.pageSize || 10).toString(),
      'Select': ['Id', 'Name', 'Code', 'Symbol']
    };
    
    // Si quieres ordenar (ej. por "Name" de forma Ascendente)
    if (criteria.orderByField) {
      params['OrderBy.Field'] = criteria.orderByField;
      params['OrderBy.Ascending'] = criteria.orderByAscending !== false ? 'true' : 'false';
    }

    // Si quieres enviar filtros (Ajustado para JsonModelBinder)
    if (criteria.filters && criteria.filters.length > 0) {
      const _filters = criteria.filters.map(filter => ({
        Field: filter.field,
        Operator: filter.operator,
        Value: filter.value
      }));
      params['Filters'] = JSON.stringify(_filters);
    }

    return this.api.get<GenericResponse<PaginatedList<Coin[]>>>(API_ROUTES.coin.search, params);
  }

  create(coin: Coin): Observable<GenericResponse<string>> {
    // 1. Creamos el contenedor de formulario nativo
    const formData = new FormData();
    
    // 2. Metemos los datos uno por uno. 
    // Los nombres ('Name', 'Code', 'Symbol') deben estar en mayúscula 
    // si el C# de tu compañero los tiene así en su clase CoinRequest.
    formData.append('Name', coin.name);
    formData.append('Code', coin.code);
    formData.append('Symbol', coin.symbol);

    // 3. Enviamos el formData puro.
    return this.api.post<GenericResponse<string>>(API_ROUTES.coin.create, formData, 'multipart');
  }

  update(coin: Coin): Observable<GenericResponse<string>> {
    const formData = new FormData();
    
    if (coin.id) formData.append('Id', coin.id.toString());
    formData.append('Name', coin.name);
    formData.append('Code', coin.code);
    formData.append('Symbol', coin.symbol);

    return this.api.put<GenericResponse<string>>(API_ROUTES.coin.update, formData, 'multipart');
  }

  delete(coinID: number): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.coin.delete(coinID));
  }
}
