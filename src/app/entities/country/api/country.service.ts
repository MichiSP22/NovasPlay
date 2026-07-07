import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GenericResponse } from '../../../core/http/http.models';
import { PaginatedList } from '../../../shared/model/pagination.model';
import { SearchRequest } from '../../../core/http/http.models';
import { ApiService } from '../../../core/http/api.service';
import { Country } from '../model/country.model';
import { AssignCoinPayload } from '../model/assign-coin.model';
import { API_ROUTES } from '../../../routes';

@Injectable({
  providedIn: 'root',
})
export class CountryService {
  private api = inject(ApiService);

  private convertToFormData(country: Country): FormData {
    const formData = new FormData();
    formData.append('Name', (country.name || '').trim());
    formData.append('IsoCode', (country.isoCode || '').trim().toUpperCase());

    if (country.id) {
      formData.append('ID', country.id.toString());
    }
    if (country.imageFile) {
      formData.append('ImageInfo.Image', country.imageFile);
    }
    if (country.iconFile) {
      formData.append('ImageInfo.Icon', country.iconFile);
    }

    return formData;
  }

  search(criteria: Partial<SearchRequest> = {}): Observable<GenericResponse<PaginatedList<Country[]>>> {
    const params: any = {
      'Pagination.PageNumber': (criteria.pageNumber || 1).toString(),
      'Pagination.PageSize': (criteria.pageSize || 10).toString(),
    };

    if (Array.isArray(criteria.select)) {
      if (criteria.select.length > 0) {
        params['Select'] = criteria.select;
      }
    } else {
      params['Select'] = ['Id', 'Name', 'IsoCode', 'ImageURL'];
    }

    if (criteria.orderByField) {
      params['OrderBy.Field'] = criteria.orderByField;
      params['OrderBy.Ascending'] = criteria.orderByAscending !== false ? 'true' : 'false';
    }

    if (criteria.filters && criteria.filters.length > 0) {
      const _filters = criteria.filters.map(filter => ({
        Field: filter.field,
        Operator: filter.operator,
        Value: filter.value,
      }));
      params['Filters'] = JSON.stringify(_filters);
    }

    return this.api.get<GenericResponse<PaginatedList<Country[]>>>(API_ROUTES.country.search, params);
  }

  create(country: Country): Observable<GenericResponse<string>> {
    const formData = this.convertToFormData(country);
    return this.api.post<GenericResponse<string>>(API_ROUTES.country.create, formData, 'multipart');
  }

  update(country: Country): Observable<GenericResponse<string>> {
    const formData = this.convertToFormData(country);
    return this.api.put<GenericResponse<string>>(API_ROUTES.country.update, formData, 'multipart');
  }

  delete(countryID: number): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.country.delete(countryID));
  }

  assignCoins(payload: AssignCoinPayload[]): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.country.assignCoins, payload);
  }
}
