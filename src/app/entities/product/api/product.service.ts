import { Injectable, inject } from '@angular/core';
import { Observable, Subject, catchError, shareReplay, tap, throwError } from 'rxjs';
import { GenericResponse } from '../../../core/http/http.models';
import { SearchRequest } from '../../../core/http/http.models';
import { ApiService } from '../../../core/http/api.service';
import { Product } from '../model/product.model';
import { AssignCategoryPayload } from '../model/assign-category.model';
import { API_ROUTES } from '../../../routes';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private api = inject(ApiService);
  public productsChanged = new Subject<void>();
  private searchCache = new Map<string, Observable<GenericResponse<any>>>();
  private readonly homeProductsQuery: SearchRequest = {
    pageNumber: 1,
    pageSize: 100,
    orderByField: 'Id',
    orderByAscending: false
  };

  constructor() {
    this.productsChanged.subscribe(() => this.clearSearchCache());
  }

  private convertToFormData(product: Product): FormData {
    const formData = new FormData();
    formData.append('Name', product.name);
    formData.append('Description', product.description);
    
    // El backend espera TimeSpan ("00:15:00"). 
    formData.append('TimeMinDetail', product.timeMinRecharge);
    formData.append('TimeMaxDetail', product.timeMaxRecharge);
    
    // Los booleanos deben ir como texto ("true" o "false")
    formData.append('SoldOut', product.soldOut.toString());
    formData.append('InternalProcess', (product.internalProcess || false).toString());

    if (product.id) formData.append('ID', product.id.toString());
    if (product.imageFile) formData.append('ImageInfo.Image', product.imageFile);
    if (product.iconFile) formData.append('ImageInfo.Icon', product.iconFile);

    return formData;
  }

  search(searchParams: SearchRequest): Observable<GenericResponse<any>> {
    const params: any = { 
      'Pagination.PageNumber': (searchParams.pageNumber || 1).toString(), 
      'Pagination.PageSize': (searchParams.pageSize || 10).toString(),
      'Select': ['Id', 'Name', 'Description', 'TimeMinDetail', 'TimeMaxDetail', 'SoldOut', 'InternalProcess', 'ImageURL', 'ProductsCategories_Category_Name']
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

    const cacheKey = JSON.stringify(params);
    const cached = this.searchCache.get(cacheKey);
    if (cached) return cached;

    const request$ = this.api.get<GenericResponse<any>>(API_ROUTES.product.search, params).pipe(
      shareReplay(1),
      catchError((error) => {
        this.searchCache.delete(cacheKey);
        return throwError(() => error);
      })
    );

    this.searchCache.set(cacheKey, request$);
    return request$;
  }

  searchHomeProducts(): Observable<GenericResponse<any>> {
    return this.search(this.homeProductsQuery);
  }

  create(product: Product): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.product.create, this.convertToFormData(product), 'multipart').pipe(
      tap(() => this.clearSearchCache())
    );
  }

  update(product: Product): Observable<GenericResponse<string>> {
    return this.api.put<GenericResponse<string>>(API_ROUTES.product.update, this.convertToFormData(product), 'multipart').pipe(
      tap(() => this.clearSearchCache())
    );
  }

  delete(productID: number): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.product.delete(productID)).pipe(
      tap(() => this.clearSearchCache())
    );
  }

  assignCategories(payload: AssignCategoryPayload[]): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(API_ROUTES.product.assignCategories, payload);
  }

  clearSearchCache() {
    this.searchCache.clear();
  }
}
