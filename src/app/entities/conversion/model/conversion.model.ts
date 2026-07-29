export interface Conversion {
  id?: number;
  fromCoinID: number;
  toCoinID: number;
  fromToRate: number;
  toFromRate: number;
  isActive: boolean;
  fromCoinCode?: string;
  fromCoinSymbol?: string;
  toCoinCode?: string;
  toCoinSymbol?: string;
}

