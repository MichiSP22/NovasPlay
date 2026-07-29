export interface Price {
  id?: number;
  detailID: number;
  paymentID: number;
  referenceCurrencyID?: number | null;
  price: number;
  promotion: boolean;
  promotionPrice: number;
  
  // Para visualización
  productName?: string;
  coinSymbol?: string;
  referenceCurrencySymbol?: string;
  displayPrice?: number;
  displayPromotionPrice?: number;
}

