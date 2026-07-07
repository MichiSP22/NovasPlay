import { Payment } from '../model/payment.model';
import { PaymentData } from '../model/payment-data.model';

export interface PaymentApiItem {
  Id: number;
  CoinID: number;
  Name: string;
  Description: string;
  International: boolean;
}

export interface PaymentDataApiItem {
  Id: number;
  PaymentID: number;
  Key: string;
  ValueType: string;
  Value: string;
}

export function mapPaymentApiItem(item: PaymentApiItem): Payment {
  return {
    id: item.Id,
    coinID: item.CoinID,
    name: item.Name,
    description: item.Description,
    international: item.International,
  };
}

export function mapPaymentDataApiItem(item: PaymentDataApiItem): PaymentData {
  return {
    id: item.Id,
    paymentID: item.PaymentID,
    key: item.Key,
    valueType: item.ValueType,
    value: item.Value,
  };
}
