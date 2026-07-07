export interface Country {
  id?: number;
  name: string;
  isoCode: string;
  coinIds?: number[];
  imageInfo?: {
    image?: string; 
    icon?: string;  
    imageURL?: string; 
    iconURL?: string;
  };
  imageFile?: File;
  iconFile?: File;
}

