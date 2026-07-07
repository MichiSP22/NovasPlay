export interface Order {
  id: number;
  userID: string;
  userAdminID?: string;
  userFirstName?: string;
  userLastName?: string;
  description?: string;
  status?: number | string;
  createdAt?: string;
  total?: number;
  OrderDetails?: any[];
  currencySymbol?: string;
  currencyTotals?: { symbol: string; amount: number }[];
  reference?: string;
  OrderScreenshots_ImageURL?: string | string[];
}

export interface ChangeOrderStatusPayload {
  OrderID: number;
  Details: {
    ID: number;
    Status: number;
  }[];
  description?: string;
}
