import { Filter, ReportRequest } from '../../../core/http/http.models';

export interface DashboardSummary {
  totals: { [key: string]: number };
}

export type FilterCriterion = Filter;

export type ReportQuery = ReportRequest;
