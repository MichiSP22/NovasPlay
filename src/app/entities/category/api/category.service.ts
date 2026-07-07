import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GenericResponse } from '../../../core/http/http.models';
import { PaginatedList } from '../../../shared/model/pagination.model';
import { ApiService } from '../../../core/http/api.service';
import { Category } from '../model/category.model';
import { API_ROUTES } from '../../../routes';

// 1. Interfaz limpia esperando los archivos físicos

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private api = inject(ApiService);

  private convertToFormData(category: Category): FormData {
    const formData = new FormData();
    formData.append('Name', category.name);
    formData.append('Description', category.description);
    
    if (category.id) {
      formData.append('ID', category.id.toString());
    }

    // Código limpio: Solo enviamos los archivos si el usuario los seleccionó
    if (category.imageFile) {
      formData.append('ImageInfo.Image', category.imageFile);
    }
    if (category.iconFile) {
      formData.append('ImageInfo.Icon', category.iconFile);
    }

    return formData;
  }

  // --- MÉTODOS BLINDADOS ---

  search(pageNumber = 1, pageSize = 10): Observable<GenericResponse<PaginatedList<Category>>> {
    const params: any = { 
      'Pagination.PageNumber': pageNumber.toString(), 
      'Pagination.PageSize': pageSize.toString(),
      'Select': ['Id', 'Name', 'Description'] // Pedimos los campos exactos
    };
    return this.api.get<GenericResponse<PaginatedList<Category>>>(API_ROUTES.category.search, params);
  }

  create(category: Category): Observable<GenericResponse<string>> {
    // ¡Añadimos 'multipart'!
    const formData = this.convertToFormData(category);
    return this.api.post<GenericResponse<string>>(API_ROUTES.category.create, formData, 'multipart');
  }

  update(category: Category): Observable<GenericResponse<string>> {
    // ¡Añadimos 'multipart'!
    const formData = this.convertToFormData(category);
    return this.api.put<GenericResponse<string>>(API_ROUTES.category.update, formData, 'multipart');
  }

  delete(categoryID: number): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.category.delete(categoryID));
  }
}
