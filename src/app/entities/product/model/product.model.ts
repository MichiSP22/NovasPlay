export interface Product {
  id?: number;
  name: string;
  description: string;
  timeMinRecharge: string; // Formato esperado: "HH:mm:ss"
  timeMaxRecharge: string;
  soldOut: boolean;
  internalProcess?: boolean;
  createdAt?: string;
  createdDate?: string;
  creationDate?: string;
  imageInfo?: {
    imageURL?: string;
    iconURL?: string;
  };
  iconInfo?: {
    iconURL?: string;
  };
  categoryIds?: number[];
  categories?: string[];
  imageFile?: File;
  iconFile?: File;
}

