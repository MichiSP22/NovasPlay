import { Coin } from '../model/coin.model';

export interface CoinApiItem {
  Id: number;
  Name: string;
  Code: string;
  Symbol: string;
}

export function mapCoinApiItem(item: CoinApiItem): Coin {
  return {
    id: item.Id,
    name: item.Name,
    code: item.Code,
    symbol: item.Symbol,
  };
}
