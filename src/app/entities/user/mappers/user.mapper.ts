import { User } from '../model/user.model';

export interface UserApiItem {
  UserID?: string;
  Id?: string;
  id?: string;
  userId?: string;
  FirstName?: string;
  firstName?: string;
  name?: string;
  LastName?: string;
  lastName?: string;
  LoginInfo_Email?: string;
  logininfo_email?: string;
  email?: string;
  Email?: string;
  Phone?: string;
  phone?: string;
  Role?: string;
  role?: string;
  LoginInfo_Status?: number;
  logininfo_status?: number;
}

export function mapUserApiItem(item: UserApiItem): User {
  return {
    id: item.UserID || item.Id || item.id || item.userId || '',
    firstName: item.FirstName || item.firstName || item.name || 'Sin Nombre',
    lastName: item.LastName || item.lastName || '',
    email: item.LoginInfo_Email || item.logininfo_email || item.email || item.Email || '',
    phone: item.Phone || item.phone || '',
    role: item.Role || item.role || 'User',
    status: item.LoginInfo_Status ?? item.logininfo_status ?? 0,
  };
}
