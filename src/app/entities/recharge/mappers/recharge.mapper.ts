import { Recharge } from '../model/recharge.model';

export interface RechargeApiItem {
  Id: number;
  ProductID: number;
  Name: string;
  Description: string;
  SoldOut: boolean;
  ImageInfo?: { ImageURL?: string };
}

export function mapRechargeApiItem(item: RechargeApiItem): Recharge {
  return {
    id: item.Id,
    productID: item.ProductID,
    name: item.Name,
    description: item.Description,
    soldOut: item.SoldOut,
    imageInfo: item.ImageInfo ? { imageURL: item.ImageInfo.ImageURL } : undefined,
  };
}
