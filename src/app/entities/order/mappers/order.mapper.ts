import { Order } from '../model/order.model';

export interface OrderApiItem {
  Id?: number;
  id?: number;
  UserID?: string;
  userId?: string;
  UserAdminID?: string;
  User_FirstName?: string;
  User_LastName?: string;
  Description?: string;
  Status?: number | string;
  CreatedAt?: string;
  Total?: number;
  OrderDetails?: any[];
  Reference?: string;
  OrderScreenshots_ImageURL?: string | string[];
}

export function mapOrderApiItem(item: OrderApiItem): Order {
  return {
    id: item.Id ?? item.id ?? 0,
    userID: item.UserID ?? item.userId ?? '',
    userAdminID: item.UserAdminID,
    userFirstName: item.User_FirstName,
    userLastName: item.User_LastName,
    description: item.Description,
    status: item.Status,
    createdAt: item.CreatedAt,
    total: item.Total,
    OrderDetails: item.OrderDetails,
    reference: item.Reference,
    OrderScreenshots_ImageURL: item.OrderScreenshots_ImageURL,
  };
}
