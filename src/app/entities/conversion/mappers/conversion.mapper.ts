import { Conversion } from '../model/conversion.model';

export interface ConversionApiItem {
  ID?: number;
  Id?: number;
  id?: number;
  FromCoinID?: number;
  fromCoinID?: number;
  ToCoinID?: number;
  toCoinID?: number;
  FromToRate?: number | string;
  fromToRate?: number | string;
  ToFromRate?: number | string;
  toFromRate?: number | string;
  IsActive?: boolean | string;
  isActive?: boolean | string;
  FKFromCoin_Code?: string;
  FKFromCoin_Symbol?: string;
  FKToCoin_Code?: string;
  FKToCoin_Symbol?: string;
  FromCoin_Code?: string;
  FromCoin_Symbol?: string;
  ToCoin_Code?: string;
  ToCoin_Symbol?: string;
}

export function mapConversionApiItem(item: ConversionApiItem): Conversion {
  return {
    id: numberOrUndefined(item.ID ?? item.Id ?? item.id),
    fromCoinID: numberValue(item.FromCoinID ?? item.fromCoinID),
    toCoinID: numberValue(item.ToCoinID ?? item.toCoinID),
    fromToRate: readDecimal(item.FromToRate ?? item.fromToRate),
    toFromRate: readDecimal(item.ToFromRate ?? item.toFromRate),
    isActive: booleanValue(item.IsActive ?? item.isActive, true),
    fromCoinCode: stringOrUndefined(item.FromCoin_Code ?? item.FKFromCoin_Code),
    fromCoinSymbol: stringOrUndefined(item.FromCoin_Symbol ?? item.FKFromCoin_Symbol),
    toCoinCode: stringOrUndefined(item.ToCoin_Code ?? item.FKToCoin_Code),
    toCoinSymbol: stringOrUndefined(item.ToCoin_Symbol ?? item.FKToCoin_Symbol),
  };
}

export function rateBetween(conversions: Conversion[], fromCoinID: number, toCoinID: number): number | null {
  if (!fromCoinID || !toCoinID) return null;
  if (fromCoinID === toCoinID) return 1;

  const active = conversions.filter(item => item.isActive);
  const direct = active.find(item => item.fromCoinID === fromCoinID && item.toCoinID === toCoinID);
  if (direct) return direct.fromToRate;

  const inverse = active.find(item => item.fromCoinID === toCoinID && item.toCoinID === fromCoinID);
  if (inverse) return inverse.toFromRate;

  return null;
}

function numberOrUndefined(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberValue(value: unknown): number {
  return numberOrUndefined(value) ?? 0;
}

function stringOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = String(value).trim();
  return parsed ? parsed : undefined;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

function readDecimal(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

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

