import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize, shareReplay } from 'rxjs/operators';
import { ApiService } from '../../../core/http/api.service';
import { GenericResponse } from '../../../core/http/http.models';
import { DashboardSummary, ReportQuery } from '../model/dashboard.model';
import { API_ROUTES } from '../../../routes';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiService = inject(ApiService);
  private inflightReportRequests = new Map<string, Observable<GenericResponse<any>>>();

  getSummary(): Observable<GenericResponse<DashboardSummary>> {
    return this.apiService.get<GenericResponse<DashboardSummary>>(API_ROUTES.dashboard.summary);
  }

  getReport(query: ReportQuery): Observable<GenericResponse<any>> {
    const params = this.toReportParams(query);
    const requestKey = JSON.stringify(params);
    const existingRequest = this.inflightReportRequests.get(requestKey);

    if (existingRequest) {
      return existingRequest;
    }

    const request$ = this.apiService
      .get<GenericResponse<any>>(API_ROUTES.dashboard.report, params)
      .pipe(
        shareReplay(1),
        finalize(() => this.inflightReportRequests.delete(requestKey))
      );

    this.inflightReportRequests.set(requestKey, request$);
    return request$;
  }

  private toReportParams(query: ReportQuery): Record<string, string> {
    const params: Record<string, string> = {};

    if (query.entity) params['Entity'] = query.entity;
    if (query.period !== undefined && query.period !== null && query.period !== '') params['Period'] = String(query.period);
    if (query.startDate) params['StartDate'] = query.startDate;
    if (query.endDate) params['EndDate'] = query.endDate;
    if (query.aggregation !== undefined && query.aggregation !== null && query.aggregation !== '') params['Aggregation'] = String(query.aggregation);
    if (query.valueField) params['ValueField'] = query.valueField;
    if (query.groupField) params['GroupField'] = query.groupField;
    if (query.seriesField) params['SeriesField'] = query.seriesField;
    if (query.chartType) params['ChartType'] = query.chartType;

    if (query.filters && query.filters.length > 0) {
      params['Filters'] = JSON.stringify(
        query.filters.map((filter) => ({
          Field: filter.field,
          Operator: filter.operator,
          Value: filter.value
        }))
      );
    }

    return params;
  }
}
