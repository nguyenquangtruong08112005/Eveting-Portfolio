import { User } from './user';

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  user: User;
}

export interface AuthState {
  token: string | null;
  role: string | null;
  uid: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (token: string, role: string, uid: string, refreshToken?: string) => void;
  logout: () => void;
}
