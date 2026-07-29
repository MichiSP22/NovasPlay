import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { GenericResponse, PaginatedCount, SearchRequest } from '../../../core/http/http.models';
import { API_ROUTES } from '../../../routes';
import { Conversion } from '../model/conversion.model';

@Injectable({
  providedIn: 'root',
})
export class ConversionService {
  private api = inject(ApiService);

  search(searchParams: Partial<SearchRequest> = {}): Observable<GenericResponse<PaginatedCount>> {
    const params: any = {
      'Pagination.PageNumber': (searchParams.pageNumber || searchParams.pagination?.pageNumber || 1).toString(),
      'Pagination.PageSize': (searchParams.pageSize || searchParams.pagination?.pageSize || 10).toString(),
      'Select': [
        'ID',
        'FromCoinID',
        'ToCoinID',
        'FromToRate',
        'ToFromRate',
        'IsActive',
        'FromCoin_Code',
        'FromCoin_Symbol',
        'ToCoin_Code',
        'ToCoin_Symbol',
      ],
    };

    const orderBy = searchParams.orderBy;
    const orderByField = searchParams.orderByField || orderBy?.field || 'ID';
    params['OrderBy.Field'] = orderByField;
    params['OrderBy.Ascending'] = String(searchParams.orderByAscending ?? orderBy?.ascending ?? false);

    const filters = (searchParams.filters || []).map(filter => ({
      Field: filter.field,
      Operator: filter.operator,
      Value: filter.value,
    }));

    if (filters.length > 0) {
      params['Filters'] = JSON.stringify(filters);
    }

    return this.api.get<GenericResponse<PaginatedCount>>(API_ROUTES.conversion.search, params);
  }

  create(conversion: Conversion): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(
      API_ROUTES.conversion.create,
      this.toFormData(conversion),
      'multipart'
    );
  }

  update(conversion: Conversion): Observable<GenericResponse<string>> {
    return this.api.put<GenericResponse<string>>(
      API_ROUTES.conversion.update,
      this.toFormData(conversion),
      'multipart'
    );
  }

  delete(conversionID: number): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.conversion.delete(conversionID));
  }

  private toFormData(conversion: Conversion): FormData {
    const formData = new FormData();
    if (conversion.id) formData.append('ID', conversion.id.toString());
    formData.append('FromCoinID', conversion.fromCoinID.toString());
    formData.append('ToCoinID', conversion.toCoinID.toString());
    formData.append('FromToRate', this.formatDecimalForApi(conversion.fromToRate));
    formData.append('ToFromRate', this.formatDecimalForApi(conversion.toFromRate));
    formData.append('IsActive', String(conversion.isActive));
    return formData;
  }

  private formatDecimalForApi(value: number | string | null | undefined): string {
    const parsed = this.parseDecimal(value);
    const safeValue = Number.isFinite(parsed) ? parsed : 0;
    return safeValue.toFixed(8);
  }

  private parseDecimal(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : NaN;
    }

    const raw = String(value ?? '').trim().replace(/\s/g, '');
    if (!raw) return NaN;

    const commaIndex = raw.lastIndexOf(',');
    const dotIndex = raw.lastIndexOf('.');
    let normalized = raw;

    if (commaIndex >= 0 && dotIndex >= 0) {
      const decimalSeparator = commaIndex > dotIndex ? ',' : '.';
      const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
      normalized = raw
        .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
        .replace(decimalSeparator, '.');
    } else if (commaIndex >= 0) {
      normalized = raw.replace(',', '.');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
}

