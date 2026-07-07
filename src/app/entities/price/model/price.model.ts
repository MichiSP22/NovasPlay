export interface Price {
  id?: number;
  detailID: number;
  paymentID: number;
  price: number;
  promotion: boolean;
  promotionPrice: number;
  
  // Para visualización
  productName?: string;
  coinSymbol?: string;
}

