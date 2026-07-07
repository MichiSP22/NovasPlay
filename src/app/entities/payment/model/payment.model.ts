export interface Payment {
  id?: number;
  coinID: number;
  name: string;
  description: string;
  international: boolean;
  imageFile?: File; 
  iconFile?: File;
}

