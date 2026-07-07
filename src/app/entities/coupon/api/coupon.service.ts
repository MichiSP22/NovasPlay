import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/http/api.service';
import { GenericResponse, SearchRequest } from '../../../core/http/http.models';
import { API_ROUTES } from '../../../routes';
import { Coupon, CouponPreviewLine, CouponPreviewResult } from '../model/coupon.model';
import { mapCouponPreviewValue } from '../mappers/coupon.mapper';

@Injectable({
  providedIn: 'root',
})
export class CouponService {
  private api = inject(ApiService);

  search(searchParams: SearchRequest): Observable<GenericResponse<any>> {
    const params: any = {
      'Pagination.PageNumber': (searchParams.pageNumber || 1).toString(),
      'Pagination.PageSize': (searchParams.pageSize || 10).toString(),
      'Select': [
        'ID',
        'Code',
      'Name',
      'Description',
      'DiscountType',
      'Scope',
      'DiscountValue',
      'MaxDiscountAmount',
      'MinOrderAmount',
      'MaxTotalUses',
      'MaxUsesPerUser',
      'UsageCount',
      'StartsAt',
      'ExpiresAt',
      'IsActive',
      'UserID',
      'DetailID',
      'ProductID',
      'CategoryID',
      'CreatedAt',
      ],
    };

    if (searchParams.orderByField) {
      params['OrderBy.Field'] = searchParams.orderByField;
      params['OrderBy.Ascending'] = searchParams.orderByAscending !== false ? 'true' : 'false';
    }

    const filters = (searchParams.filters || []).map(filter => ({
      Field: filter.field,
      Operator: filter.operator,
      Value: filter.value,
    }));

    if (filters.length > 0) {
      params['Filters'] = JSON.stringify(filters);
    }

    return this.api.get<GenericResponse<any>>(API_ROUTES.coupon.search, params);
  }

  create(coupon: Coupon): Observable<GenericResponse<string>> {
    return this.api.post<GenericResponse<string>>(
      API_ROUTES.coupon.create,
      this.toFormData(coupon),
      'multipart'
    );
  }

  update(coupon: Coupon): Observable<GenericResponse<string>> {
    if (!coupon.id) {
      throw new Error('Coupon id is required for update.');
    }
    return this.api.put<GenericResponse<string>>(
      API_ROUTES.coupon.update(coupon.id),
      this.toFormData(coupon),
      'multipart'
    );
  }

  delete(ids: number | number[]): Observable<GenericResponse<string>> {
    return this.api.delete<GenericResponse<string>>(API_ROUTES.coupon.delete(ids));
  }

  preview(code: string, lines: CouponPreviewLine[]): Observable<GenericResponse<CouponPreviewResult>> {
    const cleanCode = code.trim().toUpperCase();
    const payload = this.toPreviewPayload(cleanCode, lines);

    return this.api.post<GenericResponse<any>>(API_ROUTES.coupon.preview, payload).pipe(
      map(response => ({
        ...response,
        value: response?.success ? mapCouponPreviewValue(response?.value, lines, cleanCode) : response?.value,
      }))
    );
  }

  private toFormData(coupon: Coupon): FormData {
    const formData = new FormData();
    const payload = this.toPayload(coupon);

    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, String(value));
    });

    return formData;
  }

  private toPayload(coupon: Coupon): Record<string, unknown> {
    const code = coupon.code.trim().toUpperCase();
    const payload: Record<string, unknown> = {
      ID: coupon.id,
      Code: code,
      Name: (coupon.name || code).trim(),
      Description: coupon.description || '',
      DiscountType: coupon.discountType,
      Scope: coupon.scope ?? 0,
      DiscountValue: this.formatDecimalForApi(coupon.value),
      StartsAt: this.toApiDateTime(coupon.startDate, false),
      ExpiresAt: this.toApiDateTime(coupon.endDate, true),
      IsActive: coupon.active,
    };

    if (this.hasPositiveValue(coupon.maximumDiscount)) {
      payload['MaxDiscountAmount'] = this.formatDecimalForApi(coupon.maximumDiscount);
    }

    if (this.hasPositiveValue(coupon.minimumAmount)) {
      payload['MinOrderAmount'] = this.formatDecimalForApi(coupon.minimumAmount);
    }

    if (this.hasPositiveValue(coupon.usageLimit)) {
      payload['MaxTotalUses'] = Number(coupon.usageLimit);
    }

    if (this.hasPositiveValue(coupon.maxUsesPerUser)) {
      payload['MaxUsesPerUser'] = Number(coupon.maxUsesPerUser);
    }

    if (coupon.userID?.trim()) payload['UserID'] = coupon.userID.trim();
    if (coupon.detailID) payload['DetailID'] = coupon.detailID;
    if (coupon.productID) payload['ProductID'] = coupon.productID;
    if (coupon.categoryID) payload['CategoryID'] = coupon.categoryID;

    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  }

  private toApiDateTime(value: string | undefined, endOfDay: boolean): string | null {
    if (!value) return null;
    if (value.includes('T')) return value;
    return `${value}T${endOfDay ? '23:59:59' : '00:00:00'}`;
  }

  private formatDecimalForApi(value: number | string | null | undefined): string {
    const parsed = this.parseDecimal(value);
    const safeValue = Number.isFinite(parsed) ? parsed : 0;
    return safeValue.toFixed(2).replace('.', ',');
  }

  private hasPositiveValue(value: number | string | null | undefined): boolean {
    const parsed = this.parseDecimal(value);
    return Number.isFinite(parsed) && parsed > 0;
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

  private toPreviewPayload(code: string, lines: CouponPreviewLine[]): Record<string, unknown> {
    const items = lines.map((line, index) => ({
      Index: index,
      DetailID: line.detailID,
      DetailId: line.detailID,
      PaymentID: line.paymentID,
      PaymentId: line.paymentID,
      Price: line.price,
      Amount: line.price,
      Quantity: 1,
      Symbol: line.symbol,
      CurrencySymbol: line.symbol,
      ProductName: line.productName || '',
      DetailName: line.detailName || '',
    }));

    return {
      Code: code,
      CouponCode: code,
      Items: items,
      Lines: items,
      Total: lines.reduce((sum, item) => sum + item.price, 0),
      Totals: this.groupTotals(lines),
    };
  }

  private groupTotals(lines: CouponPreviewLine[]) {
    const totals = new Map<string, number>();
    lines.forEach(line => {
      const symbol = line.symbol || '$';
      totals.set(symbol, (totals.get(symbol) || 0) + line.price);
    });
    return Array.from(totals.entries()).map(([symbol, amount]) => ({ symbol, amount }));
  }
}
