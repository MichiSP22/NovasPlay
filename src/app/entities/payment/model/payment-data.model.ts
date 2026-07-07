export interface PaymentData {
  id?: number;
  paymentID: number;
  key: string;        
  valueType: string;        
  value: string;
  // Fallbacks para serialización PascalCase
  Id?: number;
  Key?: string;
  Value?: string;
  ValueType?: string;
}

