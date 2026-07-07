import { Category } from '../model/category.model';

export interface CategoryApiItem {
  Id: number;
  Name: string;
  Description: string;
}

export function mapCategoryApiItem(item: CategoryApiItem): Category {
  return {
    id: item.Id,
    name: item.Name,
    description: item.Description,
  };
}
