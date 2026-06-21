import { request } from './apiClient';
import { AuthResponse } from '@/types';

export class AuthService {
  static async login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('POST', '/api/web/auth/login', {
      body: { email, password },
    });
  }

  static async register(
    name: string,
    email: string,
    password: string,
    role: string
  ): Promise<{ message: string }> {
    return request<{ message: string }>('POST', '/api/web/auth/register', {
      body: { name, email, password, role },
    });
  }
}
