export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birth?: string;
  observation?: string;
  role?: string;
  isActive?: boolean;
  status?: number;
  imageInfo?: {
    imageURL?: string;
  };
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  phone: string;
  birth: string;
  observation: string;
  imageFile?: File;
  iconFile?: File;
}
