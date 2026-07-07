import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GenericResponse } from '../../../core/http/http.models';
import { PaginatedList } from '../../../shared/model/pagination.model';
import { SearchRequest } from '../../../core/http/http.models';
import { ApiService } from '../../../core/http/api.service';
import { Payment } from '../model/payment.model';
import { PaymentData } from '../model/payment-data.model';
import { API_ROUTES } from '../../../routes';

// 1. Interfaz del Método de Pago
// 2. Interfaz de los Datos Dinámicos del Pago (Ej: Correo, Cédula)
@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private api = inject(ApiService);

  // --- MÉTODOS DE PAGO (CRUD BASE) ---

  private convertToFormData(payment: Payment): FormData {
    const formData = new FormData();
    formData.append('CoinID', payment.coinID.toString());
    formData.append('Name', payment.name);
    formData.append('Description', payment.description);
    formData.append('International', payment.international.toString());
    
    if (payment.id) { formData.append('ID', payment.id.toString()); }
    if (payment.imageFile) { formData.append('ImageInfo.Image', payment.imageFile); }
    if (payment.iconFile) { formData.append('ImageInfo.Icon', payment.iconFile); }
    
    return formData;
  }

  search(pageNumber = 1, pageSize = 10): Observable<GenericResponse<any>> {
    
    const params = { 
      'Pagination.PageNumber': pageNumber.toString(), 
      'Pagination.PageSize': pageSize.toString(),
      'Select': ['Id', 'CoinID', 'Name', 'Description', 'International', 'ImageURL'] 
    };
    return this.api.get<GenericResponse<any>>(API_ROUTES.payment.search, params);
  }

  create(payment: Payment): Observable<GenericResponse<string>> {
    
    return this.api.post<GenericResponse<string>>(API_ROUTES.payment.create, this.convertToFormData(payment), 'multipart');
  }

  update(payment: Payment): Observable<GenericResponse<string>> {
    return this.api.put<GenericResponse<string>>(API_ROUTES.payment.update, this.convertToFormData(payment), 'multipart');
  }

  delete(paymentID: number): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.payment.delete(paymentID));
  }

  // --- MÉTODOS DE PAYMENT DATA (CAMPOS DINÁMICOS) ---

  searchData(paymentId: number, criteria: Partial<SearchRequest> = {}): Observable<GenericResponse<PaginatedList<PaymentData>>> {
    const params: any = {
      'Pagination.PageNumber': (criteria.pageNumber || 1).toString(),
      'Pagination.PageSize': (criteria.pageSize || 100).toString(),
      'Select': ['Id', 'PaymentID', 'Key', 'Value', 'ValueType']
    };
    
    if (criteria.orderByField) {
      params['OrderBy.Field'] = criteria.orderByField;
      params['OrderBy.Ascending'] = criteria.orderByAscending !== false ? 'true' : 'false';
    }

    const allFilters: any[] = [
      { Field: 'PaymentID', Operator: 0, Value: paymentId }
    ];

    if (criteria.filters && criteria.filters.length > 0) {
      criteria.filters.forEach((filter) => {
        allFilters.push({
          Field: filter.field,
          Operator: filter.operator,
          Value: filter.value
        });
      });
    }
    params['Filters'] = JSON.stringify(allFilters);

    return this.api.get<GenericResponse<PaginatedList<PaymentData>>>(API_ROUTES.payment.searchData, params);
  }

  private convertDataArrayToFormData(data: PaymentData[]): FormData {
    const formData = new FormData();
    data.forEach((item, index) => {
      // Usamos el prefijo 'Data' porque el parámetro en C# se llama 'Data'
      formData.append(`Data[${index}].PaymentID`, item.paymentID.toString());
      formData.append(`Data[${index}].Key`, item.key);
      formData.append(`Data[${index}].ValueType`, item.valueType);
      
      if (item.value) {
        formData.append(`Data[${index}].Value`, item.value);
      }
      if (item.id) {
        formData.append(`Data[${index}].Id`, item.id.toString());
      }
    });
    return formData;
  }

  createData(data: PaymentData[]): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.payment.createData, this.convertDataArrayToFormData(data), 'multipart');
  }

  updateData(data: PaymentData[]): Observable<GenericResponse<string>> {
    return this.api.put<GenericResponse<string>>(API_ROUTES.payment.updateData, this.convertDataArrayToFormData(data), 'multipart');
  }

  deleteData(id: number): Observable<GenericResponse<string>> {    
    // El backend espera "[FromBody] List<int> paymentIDs", por lo tanto
    // le enviamos un arreglo con el id, en formato JSON usando nuestro apiService.delete
    return this.api.delete<GenericResponse<string>>(API_ROUTES.payment.deleteData([id]));
  }
}
