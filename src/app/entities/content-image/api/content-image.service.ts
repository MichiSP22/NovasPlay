import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { GenericResponse, PaginatedCount, SearchRequest } from '../../../core/http/http.models';
import { API_ROUTES } from '../../../routes';
import { ContentImage } from '../model/content-image.model';
import { mapContentImageApiItem } from '../mappers/content-image.mapper';

@Injectable({
  providedIn: 'root',
})
export class ContentImageService {
  private api = inject(ApiService);

  search(searchParams: SearchRequest): Observable<GenericResponse<PaginatedCount>> {
    const params: any = {
      'Pagination.PageNumber': (searchParams.pageNumber || searchParams.pagination?.pageNumber || 1).toString(),
      'Pagination.PageSize': (searchParams.pageSize || searchParams.pagination?.pageSize || 10).toString(),
      'Select': ['ID', 'Category', 'Link', 'TargetLink', 'StartsAt', 'ExpiresAt', 'IsActive', 'CreatedAt'],
    };

    const orderBy = searchParams.orderBy;
    const orderByField = searchParams.orderByField || orderBy?.field;
    if (orderByField) {
      params['OrderBy.Field'] = orderByField;
      params['OrderBy.Ascending'] = String(searchParams.orderByAscending ?? orderBy?.ascending ?? false);
    }

    const filters = (searchParams.filters || []).map(filter => ({
      Field: filter.field,
      Operator: filter.operator,
      Value: filter.value,
    }));

    if (filters.length > 0) {
      params['Filters'] = JSON.stringify(filters);
    }

    return this.api.get<GenericResponse<PaginatedCount>>(API_ROUTES.contentImage.search, params);
  }

  getActiveByCategory(category: string): Observable<GenericResponse<ContentImage[]>> {
    return this.api.get<GenericResponse<any[]>>(API_ROUTES.contentImage.active(category)).pipe(
      map(response => ({
        ...response,
        value: Array.isArray(response?.value) ? response.value.map(mapContentImageApiItem) : [],
      }))
    );
  }

  create(image: ContentImage): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(
      API_ROUTES.contentImage.create,
      this.toFormData(image),
      'multipart'
    );
  }

  update(image: ContentImage): Observable<GenericResponse<string>> {
    if (!image.id) {
      throw new Error('Content image id is required for update.');
    }

    return this.api.put<GenericResponse<string>>(
      API_ROUTES.contentImage.update(image.id),
      this.toFormData(image),
      'multipart'
    );
  }

  delete(ids: number | number[]): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.contentImage.delete(ids));
  }

  private toFormData(image: ContentImage): FormData {
    const formData = new FormData();
    formData.append('Category', String(image.category || '').trim().toLowerCase());
    formData.append('IsActive', String(image.active));

    const link = image.link?.trim();
    if (link) formData.append('Link', link);

    const targetLink = image.targetLink?.trim();
    if (targetLink) formData.append('TargetLink', targetLink);

    const startsAt = this.toApiDateTime(image.startsAt, false);
    if (startsAt) formData.append('StartsAt', startsAt);

    const expiresAt = this.toApiDateTime(image.expiresAt, true);
    if (expiresAt) formData.append('ExpiresAt', expiresAt);

    if (image.imageFile) {
      formData.append('ImageInfo.Image', image.imageFile);
    }

    return formData;
  }

  private toApiDateTime(value: string | undefined, endOfDay: boolean): string | null {
    if (!value) return null;
    if (value.includes('T')) return value;
    return `${value}T${endOfDay ? '23:59:59' : '00:00:00'}`;
  }
}
