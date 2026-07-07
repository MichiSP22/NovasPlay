import {
  Coupon,
  CouponDiscountType,
  CouponMoneyAmount,
  CouponPreviewLine,
  CouponPreviewResult,
  CouponScope,
} from '../model/coupon.model';

export function mapCouponApiItem(item: any): Coupon {
  const discountType = readDiscountType(
    readValue(item, 'DiscountType', 'discountType', 'Type', 'type', 'CouponType', 'couponType')
  );

  return {
    id: readNumber(item, 'Id', 'ID', 'id'),
    code: readString(item, 'Code', 'code', 'CouponCode', 'couponCode').toUpperCase(),
    name: readString(item, 'Name', 'name'),
    description: readString(item, 'Description', 'description'),
    discountType,
    scope: readScope(readValue(item, 'Scope', 'scope')),
    value: readNumber(
      item,
      'DiscountValue',
      'discountValue',
      'Value',
      'value',
      'Amount',
      'amount',
      'Percentage',
      'percentage'
    ) || 0,
    minimumAmount: readOptionalNumber(
      item,
      'MinOrderAmount',
      'minOrderAmount',
      'MinimumAmount',
      'minimumAmount',
      'MinAmount',
      'minAmount'
    ),
    maximumDiscount: readOptionalNumber(
      item,
      'MaxDiscountAmount',
      'maxDiscountAmount',
      'MaximumDiscount',
      'maximumDiscount',
      'MaxDiscount',
      'maxDiscount',
      'MaximumDiscountAmount',
      'maximumDiscountAmount'
    ),
    usageLimit: readOptionalNumber(
      item,
      'MaxTotalUses',
      'maxTotalUses',
      'UsageLimit',
      'usageLimit',
      'Limit',
      'limit'
    ),
    maxUsesPerUser: readOptionalNumber(item, 'MaxUsesPerUser', 'maxUsesPerUser'),
    usageCount: readOptionalNumber(item, 'UsageCount', 'usageCount', 'Uses', 'uses', 'UsedCount', 'usedCount'),
    startDate: readString(item, 'StartsAt', 'startsAt', 'StartDate', 'startDate', 'ValidFrom', 'validFrom'),
    endDate: readString(item, 'ExpiresAt', 'expiresAt', 'EndDate', 'endDate', 'ValidTo', 'validTo', 'ExpirationDate', 'expirationDate'),
    active: readBoolean(item, true, 'IsActive', 'isActive', 'Active', 'active', 'Enabled', 'enabled'),
    singleUsePerUser: readBoolean(
      item,
      false,
      'SingleUsePerUser',
      'singleUsePerUser',
      'OncePerUser',
      'oncePerUser'
    ),
    userID: readString(item, 'UserID', 'userID', 'UserId', 'userId'),
    detailID: readOptionalNumber(item, 'DetailID', 'detailID', 'DetailId', 'detailId') ?? null,
    productID: readOptionalNumber(item, 'ProductID', 'productID', 'ProductId', 'productId') ?? null,
    categoryID: readOptionalNumber(item, 'CategoryID', 'categoryID', 'CategoryId', 'categoryId') ?? null,
    createdAt: readString(item, 'CreatedAt', 'createdAt', 'CreationDate', 'creationDate'),
  };
}

export function mapCouponPreviewValue(value: any, fallbackLines: CouponPreviewLine[], code: string): CouponPreviewResult {
  const raw = value || {};
  const subtotalBySymbol = readMoneyCollection(raw, fallbackLines, [
    'SubtotalBySymbol',
    'subtotalBySymbol',
    'Subtotals',
    'subtotals',
    'TotalBefore',
    'totalBefore',
    'Subtotal',
    'subtotal',
    'Total',
    'total',
  ], true);

  const discountBySymbol = readMoneyCollection(raw, fallbackLines, [
    'DiscountBySymbol',
    'discountBySymbol',
    'Discounts',
    'discounts',
    'Discount',
    'discount',
    'DiscountAmount',
    'discountAmount',
  ], false);

  const totalsBySymbol = readMoneyCollection(raw, fallbackLines, [
    'TotalsBySymbol',
    'totalsBySymbol',
    'TotalAfter',
    'totalAfter',
    'FinalTotal',
    'finalTotal',
    'TotalWithCoupon',
    'totalWithCoupon',
  ], false);

  const hasMultipleSymbols = new Set(fallbackLines.map(line => line.symbol || '$')).size > 1;
  const fallbackTotals = totalsBySymbol.length && !hasMultipleSymbols
    ? totalsBySymbol
    : subtractMoneyCollections(subtotalBySymbol, discountBySymbol);

  const hasDiscount = discountBySymbol.some(item => item.amount > 0);
  const explicitValid = readOptionalBoolean(raw, 'Valid', 'valid', 'IsValid', 'isValid', 'CanApply', 'canApply');

  return {
    valid: explicitValid ?? hasDiscount,
    code: readString(raw, 'Code', 'code', 'CouponCode', 'couponCode') || code,
    message: readString(raw, 'Message', 'message', 'Response', 'response') ||
      (hasDiscount ? 'Cupon aplicado correctamente.' : 'El cupon no genero descuento.'),
    couponId: readOptionalNumber(raw, 'CouponID', 'couponID', 'CouponId', 'couponId', 'Id', 'id'),
    discountBySymbol,
    totalsBySymbol: fallbackTotals,
    subtotalBySymbol,
    raw,
  };
}

export function calculateSubtotalBySymbol(lines: CouponPreviewLine[]): CouponMoneyAmount[] {
  const totals = new Map<string, number>();
  lines.forEach(line => {
    const symbol = line.symbol || '$';
    totals.set(symbol, (totals.get(symbol) || 0) + line.price);
  });
  return Array.from(totals.entries()).map(([symbol, amount]) => ({ symbol, amount }));
}

function readMoneyCollection(
  source: any,
  fallbackLines: CouponPreviewLine[],
  keys: string[],
  fallbackToSubtotal: boolean
): CouponMoneyAmount[] {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const parsed = parseMoneyValue(source[key], fallbackLines);
    if (parsed.length) return parsed;
  }
  return fallbackToSubtotal ? calculateSubtotalBySymbol(fallbackLines) : [];
}

function parseMoneyValue(value: any, fallbackLines: CouponPreviewLine[]): CouponMoneyAmount[] {
  if (value === null || value === undefined || value === '') return [];

  if (typeof value === 'number' || typeof value === 'string') {
    const amount = parseDecimal(value);
    if (!Number.isFinite(amount)) return [];
    return distributeAmountByLines(amount, fallbackLines);
  }

  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'number' || typeof item === 'string') {
          return { symbol: fallbackLines[0]?.symbol || '$', amount: parseDecimal(item) };
        }

        return {
          symbol: readString(item, 'Symbol', 'symbol', 'CurrencySymbol', 'currencySymbol', 'CoinSymbol', 'coinSymbol') ||
            fallbackLines[0]?.symbol || '$',
          amount: readNumber(item, 'Amount', 'amount', 'Value', 'value', 'Total', 'total') || 0,
        };
      })
      .filter(item => Number.isFinite(item.amount));
  }

  if (typeof value === 'object') {
    const directAmount = readOptionalNumber(value, 'Amount', 'amount', 'Value', 'value', 'Total', 'total');
    if (directAmount !== undefined) {
      return [{
        symbol: readString(value, 'Symbol', 'symbol', 'CurrencySymbol', 'currencySymbol') || fallbackLines[0]?.symbol || '$',
        amount: directAmount,
      }];
    }

    return Object.entries(value)
      .map(([symbol, amount]) => ({ symbol, amount: parseDecimal(amount as any) }))
      .filter(item => Number.isFinite(item.amount));
  }

  return [];
}

function distributeAmountByLines(amount: number, fallbackLines: CouponPreviewLine[]): CouponMoneyAmount[] {
  const lines = fallbackLines.filter(line => Number.isFinite(line.price) && line.price > 0);
  if (lines.length === 0) return [{ symbol: fallbackLines[0]?.symbol || '$', amount }];

  const subtotal = lines.reduce((sum, line) => sum + line.price, 0);
  if (subtotal <= 0) return [{ symbol: lines[0]?.symbol || '$', amount }];

  const bySymbol = new Map<string, number>();
  let assigned = 0;

  lines.forEach((line, index) => {
    const part = index === lines.length - 1
      ? roundMoney(amount - assigned)
      : roundMoney(amount * (line.price / subtotal));
    assigned += part;

    const symbol = line.symbol || '$';
    bySymbol.set(symbol, roundMoney((bySymbol.get(symbol) || 0) + part));
  });

  return Array.from(bySymbol.entries()).map(([symbol, value]) => ({
    symbol,
    amount: Math.max(0, value),
  }));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function subtractMoneyCollections(
  subtotalBySymbol: CouponMoneyAmount[],
  discountBySymbol: CouponMoneyAmount[]
): CouponMoneyAmount[] {
  const discounts = new Map(discountBySymbol.map(item => [item.symbol, item.amount]));
  return subtotalBySymbol.map(item => ({
    symbol: item.symbol,
    amount: Math.max(0, item.amount - (discounts.get(item.symbol) || 0)),
  }));
}

function readDiscountType(value: any): CouponDiscountType {
  if (typeof value === 'number') return value === 1 ? 1 : 0;
  const raw = String(value ?? '').trim().toLowerCase();
  if (['1', 'fixed', 'fixedamount', 'amount', 'monto', 'valor'].includes(raw)) return 1;
  return 0;
}

function readScope(value: any): CouponScope {
  if (typeof value === 'number' && [0, 1, 2, 3, 4].includes(value)) return value as CouponScope;
  const raw = String(value ?? '').trim().toLowerCase();
  if (['1', 'orderitem', 'order_item', 'item'].includes(raw)) return 1;
  if (['2', 'detail', 'recarga'].includes(raw)) return 2;
  if (['3', 'product', 'producto'].includes(raw)) return 3;
  if (['4', 'category', 'categoria'].includes(raw)) return 4;
  return 0;
}

function readValue(source: any, ...keys: string[]): any {
  if (!source) return undefined;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

function readString(source: any, ...keys: string[]): string {
  const value = readValue(source, ...keys);
  return value === undefined || value === null ? '' : String(value).trim();
}

function readNumber(source: any, ...keys: string[]): number {
  const value = readValue(source, ...keys);
  const parsed = parseDecimal(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readOptionalNumber(source: any, ...keys: string[]): number | undefined {
  const value = readValue(source, ...keys);
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = parseDecimal(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readBoolean(source: any, defaultValue: boolean, ...keys: string[]): boolean {
  return readOptionalBoolean(source, ...keys) ?? defaultValue;
}

function readOptionalBoolean(source: any, ...keys: string[]): boolean | undefined {
  const value = readValue(source, ...keys);
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const raw = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'activo', 'active', 'enabled'].includes(raw)) return true;
  if (['false', '0', 'no', 'inactivo', 'inactive', 'disabled'].includes(raw)) return false;
  return undefined;
}

function readNumberArray(source: any, ...keys: string[]): number[] {
  const value = readValue(source, ...keys);
  if (value === undefined || value === null || value === '') return [];

  const values = Array.isArray(value) ? value : String(value).split(',');
  return values
    .map(item => parseDecimal(item as any))
    .filter(item => Number.isFinite(item) && item > 0);
}

function parseDecimal(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;

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

  return Number(normalized);
}
