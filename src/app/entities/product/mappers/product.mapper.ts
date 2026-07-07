import { Product } from '../model/product.model';

export interface ProductApiItem {
  Id: number;
  Name: string;
  Description: string;
  TimeMinDetail: string;
  TimeMaxDetail: string;
  SoldOut: boolean;
  InternalProcess?: boolean;
  CreatedAt?: string;
  CreatedDate?: string;
  CreationDate?: string;
  ImageInfo?: { ImageURL?: string; IconURL?: string };
  IconInfo?: { IconURL?: string };
  IconURL?: string;
  Categories?: Array<{ Id: number }>;
}

export function mapProductApiItem(item: ProductApiItem): Product {
  return {
    id: item.Id,
    name: item.Name,
    description: item.Description,
    timeMinRecharge: item.TimeMinDetail,
    timeMaxRecharge: item.TimeMaxDetail,
    soldOut: item.SoldOut,
    internalProcess: item.InternalProcess,
    createdAt: item.CreatedAt || item.CreatedDate || item.CreationDate,
    imageInfo: item.ImageInfo ? { imageURL: item.ImageInfo.ImageURL, iconURL: item.ImageInfo.IconURL } : undefined,
    iconInfo: item.IconInfo?.IconURL || item.IconURL || item.ImageInfo?.IconURL ? { iconURL: item.IconInfo?.IconURL || item.IconURL || item.ImageInfo?.IconURL } : undefined,
    categoryIds: item.Categories ? item.Categories.map((c) => c.Id) : [],
  };
}
