import { Price } from '../model/price.model';

export interface PriceApiItem {
  Id: number;
  DetailID: number;
  PaymentID?: number;
  CoinID?: number;
  Price?: number | string;
  Amount?: number | string;
  Value?: number | string;
  Promotion?: boolean;
  PromotionPrice?: number | string;
  Detail_Name?: string;
  Payment_Coin_Symbol?: string;
}

export function mapPriceApiItem(item: PriceApiItem): Price {
  return {
    id: item.Id,
    detailID: item.DetailID,
    paymentID: item.PaymentID || item.CoinID || 0,
    price: readDecimal(item.Price, item.Amount, item.Value),
    promotion: item.Promotion || false,
    promotionPrice: readDecimal(item.PromotionPrice),
    productName: item.Detail_Name || '',
    coinSymbol: item.Payment_Coin_Symbol || '',
  };
}

function readDecimal(...values: Array<number | string | null | undefined>): number {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const raw = String(value).trim().replace(/\s/g, '');
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
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
