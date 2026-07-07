export interface Recharge {
  id?: number;
  productID: number; // El ID del producto al que pertenece
  name: string;
  description: string;
  soldOut: boolean;
  imageInfo?: {
    imageURL?: string;
  };
  imageFile?: File;
  iconFile?: File;
}

