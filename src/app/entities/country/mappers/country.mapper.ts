import { Country } from '../model/country.model';

export interface CountryApiItem {
  Id: number;
  Name: string;
  IsoCode: string;
  ImageInfo?: { ImageURL?: string; IconURL?: string };
}

export function mapCountryApiItem(item: CountryApiItem): Country {
  return {
    id: item.Id,
    name: item.Name,
    isoCode: item.IsoCode,
    imageInfo: item.ImageInfo
      ? { imageURL: item.ImageInfo.ImageURL, iconURL: item.ImageInfo.IconURL }
      : undefined,
  };
}
