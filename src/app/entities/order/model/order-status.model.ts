export enum OrderStatus {
  Pending = 0,
  Confirmated = 1,
  Processing = 2,
  Completed = 3,
  Refunded = 4,
  Cancelled = 5,
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'Pendiente',
  [OrderStatus.Confirmated]: 'Confirmado',
  [OrderStatus.Processing]: 'Procesando',
  [OrderStatus.Completed]: 'Completado',
  [OrderStatus.Refunded]: 'Reembolsado',
  [OrderStatus.Cancelled]: 'Cancelado',
};

export function getOrderStatusLabel(status: number | string | undefined | null): string {
  const n = typeof status === 'string' ? parseInt(status, 10) : status;
  if (typeof n !== 'number' || isNaN(n) || n < OrderStatus.Pending || n > OrderStatus.Cancelled) {
    return ORDER_STATUS_LABELS[OrderStatus.Pending];
  }
  return ORDER_STATUS_LABELS[n as OrderStatus];
}

export function getOrderStatusClass(status: number | string | undefined | null): string {
  const label = getOrderStatusLabel(status).toLowerCase();
  return label;
}

export function getOrderStatusColor(status: number | string | undefined | null): string {
  const n = typeof status === 'string' ? parseInt(status, 10) : status;
  switch (n) {
    case OrderStatus.Confirmated:
    case OrderStatus.Completed:
      return '#00ffcc';
    case OrderStatus.Processing:
      return '#ffd700';
    case OrderStatus.Refunded:
    case OrderStatus.Cancelled:
      return '#ff4d4d';
    case OrderStatus.Pending:
    default:
      return '#ffea00';
  }
}

export function getCurrencySymbol(item: any): string {
  if (!item || typeof item !== 'object') return '$';

  const fromNested = item.OrderDetails?.[0]?.symbol || item.OrderDetails?.[0]?.simbolo;
  if (fromNested) return fromNested;

  return (
    item.currencySymbol ||
    item.CurrencySymbol ||
    item.CoinSymbol ||
    item.coinSymbol ||
    item.symbol ||
    item.simbolo ||
    item.Simbolo ||
    item.DetailPayments_Payment_Coin_Symbol ||
    item.Payment_Coin_Symbol ||
    item.payment_Coin_Symbol ||
    '$'
  );
}
