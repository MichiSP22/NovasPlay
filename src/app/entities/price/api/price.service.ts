import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { SearchRequest } from '../../../core/http/http.models';
import { GenericResponse } from '../../../core/http/http.models';
import { Price } from '../model/price.model';
import { API_ROUTES } from '../../../routes';

@Injectable({
  providedIn: 'root',
})
export class PriceService {
  private api = inject(ApiService);

  search(searchParams: SearchRequest): Observable<GenericResponse<any>> {
    const pageNumber = Math.max(1, searchParams.pageNumber || 1);
    const pageSize = Math.min(100, Math.max(1, searchParams.pageSize || 10));

    const params: any = { 
      'Pagination.PageNumber': pageNumber.toString(), 
      'Pagination.PageSize': pageSize.toString(),
      'Select': [
        'Id', 
        'DetailID', 
        'PaymentID', 
        'Price', 
        'Promotion', 
        'PromotionPrice',
        'Detail_Name',
        'Payment_Coin_Symbol'
      ]
    };
    
    if (searchParams.orderByField) {
      params['OrderBy.Field'] = searchParams.orderByField;
      params['OrderBy.Ascending'] = searchParams.orderByAscending !== false ? 'true' : 'false';
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

    return this.api.get<GenericResponse<any>>(API_ROUTES.price.search, params);
  }

  private convertPricesToFormData(prices: Price[]): FormData {
    const formData = new FormData();
    prices.forEach((item, index) => {
      // Usamos el prefijo 'priceData' asumiendo que el parámetro en C# se llama 'priceData'
      formData.append(`priceData[${index}].DetailID`, item.detailID.toString());
      formData.append(`priceData[${index}].PaymentID`, item.paymentID.toString());
      formData.append(`priceData[${index}].Price`, this.formatDecimalForApi(item.price));
      formData.append(`priceData[${index}].Promotion`, item.promotion ? 'true' : 'false');
      formData.append(`priceData[${index}].PromotionPrice`, this.formatDecimalForApi(item.promotionPrice));
      
      if (item.id) {
        formData.append(`priceData[${index}].Id`, item.id.toString());
      }
    });
    return formData;
  }

  private formatDecimalForApi(value: number | string | null | undefined): string {
    const parsed = this.parseDecimal(value);
    const safeValue = Number.isFinite(parsed) ? parsed : 0;
    return safeValue.toFixed(2).replace('.', ',');
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

  create(prices: Price[]): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.price.create, this.convertPricesToFormData(prices), 'multipart');
  }

  update(prices: Price[]): Observable<GenericResponse<string>> {
    return this.api.put<GenericResponse<string>>(API_ROUTES.price.update, this.convertPricesToFormData(prices), 'multipart');
  }

  // Fíjate que el Delete recibe un array de IDs en el body
  delete(priceIDs: number | number[]): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.price.delete(priceIDs));
  }
}
