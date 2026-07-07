export interface RegisterRequest {
  firstName: string;
  lastName: string;
  phone: string;
  birth: string;
  username: string;
  email: string;
  password: string;
  suscribedToNewsletter: boolean;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  refreshToken: boolean;
}

export interface AuthResponse {
  message: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

