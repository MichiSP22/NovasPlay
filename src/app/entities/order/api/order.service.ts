import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { SearchRequest } from '../../../core/http/http.models';
import { GenericResponse } from '../../../core/http/http.models';
import { ChangeOrderStatusPayload, Order } from '../model/order.model';
import { API_ROUTES } from '../../../routes';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private api = inject(ApiService);

  search(searchParams: SearchRequest): Observable<GenericResponse<any>> {
    const defaultSelect = [
      'Id',
      'UserID',
      'UserAdminID',
      'CreatedAt',
      'Description',
      'User_FirstName',
      'User_LastName',
      'OrderDetails_Id',
      'OrderDetails_OrderDetailData_Value',
      'OrderDetails_Reference',
      'OrderDetails_PaymentDate',
      'OrderDetails_Name',
      'OrderDetails_Price',
      'OrderDetails_Status',
      'OrderDetails_PaymentID',
    ];

    const params: any = { 
      'Pagination.PageNumber': (searchParams.pageNumber || 1).toString(), 
      'Pagination.PageSize': (searchParams.pageSize || 10).toString(),
      'Select': searchParams.select || defaultSelect
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

    return this.api.get<GenericResponse<any>>(API_ROUTES.order.search, params);
  }

  // Método para el cliente público (cuando compran)
  create(orderPayload: any): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.order.create, orderPayload, "multipart");
  }

  // Método estrella para el Admin: Procesar la orden
  changeStatus(payload: ChangeOrderStatusPayload): Observable<GenericResponse<string>> {
    const formData = new FormData();
    formData.append('OrderID', payload.OrderID.toString());
    // Siempre enviar Description (con D mayúscula para match con C# model)
    formData.append('Description', payload.description || '');
    
    if (payload.Details && payload.Details.length > 0) {
      payload.Details.forEach((r, index: number) => {
        formData.append(`Details[${index}].ID`, r.ID.toString());
        formData.append(`Details[${index}].Status`, r.Status.toString());
      });
    }
    return this.api.patch<GenericResponse<string>>(API_ROUTES.order.changeStatus, formData);
  }
}
