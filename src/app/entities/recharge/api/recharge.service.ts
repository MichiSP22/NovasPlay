import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
// Importamos tu interfaz centralizada
import { SearchRequest } from '../../../core/http/http.models';
// Asumo que tienes una interfaz genérica de respuesta
import { GenericResponse } from '../../../core/http/http.models'; 
import { Recharge } from '../model/recharge.model';
import { API_ROUTES } from '../../../routes';

@Injectable({
  providedIn: 'root',
})
export class RechargeService {
  private api = inject(ApiService);

  private convertToFormData(recharge: Recharge): FormData {
    const formData = new FormData();
    formData.append('ProductID', recharge.productID.toString());
    formData.append('Name', recharge.name);
    formData.append('Description', recharge.description);
    formData.append('SoldOut', recharge.soldOut.toString());

    if (recharge.id) formData.append('ID', recharge.id.toString());
    if (recharge.imageFile) formData.append('ImageInfo.Image', recharge.imageFile);
    if (recharge.iconFile) formData.append('ImageInfo.Icon', recharge.iconFile);

    return formData;
  }

  // Ahora usamos tu interfaz SearchRequest directamente
  search(searchParams: SearchRequest): Observable<GenericResponse<any>> {
    const params: any = { 
      'Pagination.PageNumber': (searchParams.pageNumber || 1).toString(), 
      'Pagination.PageSize': (searchParams.pageSize || 10).toString(),
      'Select': [
        'Id', 
        'ProductID', 
        'Name', 
        'Description', 
        'SoldOut', 
        'ImageURL',
        'DetailPayments_PaymentID',
        'DetailPayments_Price',
        'DetailPayments_Payment_Coin_Symbol',
        'DetailPayments_Promotion',
        'DetailPayments_PromotionPrice'
      ]
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

    return this.api.get<GenericResponse<any>>(API_ROUTES.recharge.search, params);
  }

  create(recharge: Recharge): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.recharge.create, this.convertToFormData(recharge), 'multipart');
  }

  update(recharge: Recharge): Observable<GenericResponse<string>> {
    return this.api.put<GenericResponse<string>>(API_ROUTES.recharge.update, this.convertToFormData(recharge), 'multipart');
  }

  delete(detailID: number): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.recharge.delete(detailID));
  }
}
