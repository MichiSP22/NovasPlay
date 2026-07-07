import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, tap, map, shareReplay } from 'rxjs';
import { Payment } from '../../entities/payment';
import { Coin } from '../../entities/coin';

import { ApiService } from '../http/api.service';
import { API_ROUTES } from '../../routes';

@Injectable({
  providedIn: 'root'
})
export class DataCacheService {
  private api = inject(ApiService);

  private paymentsCache = new Map<number, Payment>();
  private coinsCache = new Map<number, Coin>();

  private loadData$: Observable<boolean> | null = null;

  ensureDataLoaded(): Observable<boolean> {
    if (this.loadData$) {
      return this.loadData$;
    }

    this.loadData$ = forkJoin({
      payments: this.api.get<any>(API_ROUTES.payment.search, {
        'Pagination.PageNumber': '1',
        'Pagination.PageSize': '100',
        'Select': ['Id', 'CoinID', 'Name']
      }),
      coins: this.api.get<any>(API_ROUTES.coin.search, {
        'Pagination.PageNumber': '1',
        'Pagination.PageSize': '100',
        'Select': ['Id', 'Symbol']
      })
    }).pipe(
      tap((res: any) => {
        // Cargar pagos en caché
        if (res.payments && res.payments.success && res.payments.value?.items) {
           res.payments.value.items.forEach((p: any) => {
              const id = p.id || p.Id || p.paymentID || p.PaymentID;
              if (id !== undefined && id !== null) {
                 this.paymentsCache.set(Number(id), {
                   id: Number(id),
                   coinID: p.coinID || p.CoinID || 0,
                   name: p.name || p.Name || 'Desconocido',
                   description: p.description || p.Description || '',
                   international: p.international || p.International || false
                 });
              }
           });
        }
        
        // Cargar monedas en caché
        if (res.coins && res.coins.success && res.coins.value?.items) {
           res.coins.value.items.forEach((c: any) => {
              const id = c.id || c.Id || c.coinID || c.CoinID;
              if (id !== undefined && id !== null) {
                 this.coinsCache.set(Number(id), {
                   id: Number(id),
                   name: c.name || c.Name || '',
                   code: c.code || c.Code || '',
                   symbol: c.symbol || c.Symbol || '$'
                 });
              }
           });
        }
      }),
      map(() => true),
      shareReplay(1)
    );

    return this.loadData$;
  }

  getPaymentName(paymentId: number | string | undefined | null): string {
    if (paymentId === undefined || paymentId === null || paymentId === '') return 'Desconocido';
    const numId = Number(paymentId);
    if (isNaN(numId)) return 'Desconocido';
    
    const payment = this.paymentsCache.get(numId);
    return payment ? payment.name : 'Desconocido';
  }

  getSymbolByPaymentId(paymentId: number | string | undefined | null): string {
    if (paymentId === undefined || paymentId === null || paymentId === '') return '$';
    const numId = Number(paymentId);
    if (isNaN(numId)) return '$';
    
    const payment = this.paymentsCache.get(numId);
    if (payment && payment.coinID) {
      const coin = this.coinsCache.get(Number(payment.coinID));
      return coin && coin.symbol ? coin.symbol : '$';
    }
    return '$';
  }
}
