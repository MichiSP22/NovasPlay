export type CouponDiscountType = 0 | 1;
export type CouponScope = 0 | 1 | 2 | 3 | 4;

export interface Coupon {
  id?: number;
  code: string;
  name?: string;
  description?: string;
  discountType: CouponDiscountType;
  scope: CouponScope;
  value: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  maxUsesPerUser?: number;
  usageCount?: number;
  startDate?: string;
  endDate?: string;
  active: boolean;
  singleUsePerUser?: boolean;
  userID?: string;
  detailID?: number | null;
  productID?: number | null;
  categoryID?: number | null;
  createdAt?: string;
}

export interface CouponPreviewLine {
  detailID: number;
  paymentID: number;
  price: number;
  symbol: string;
  productName?: string;
  detailName?: string;
}

export interface CouponMoneyAmount {
  symbol: string;
  amount: number;
}

export interface CouponPreviewResult {
  valid: boolean;
  code: string;
  message: string;
  couponId?: number;
  discountBySymbol: CouponMoneyAmount[];
  totalsBySymbol: CouponMoneyAmount[];
  subtotalBySymbol: CouponMoneyAmount[];
  raw?: any;
}
