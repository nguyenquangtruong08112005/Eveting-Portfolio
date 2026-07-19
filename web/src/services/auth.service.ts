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

  static async googleLogin(
    idToken: string,
    role?: string
  ): Promise<AuthResponse> {
    return request<AuthResponse>('POST', '/api/web/auth/google-login', {
      body: { idToken, role },
    });
  }

  static async facebookLogin(
    accessToken: string,
    role?: string
  ): Promise<AuthResponse> {
    return request<AuthResponse>('POST', '/api/web/auth/facebook-login', {
      body: { accessToken, role },
    });
  }

  static async requestPasswordReset(
    email: string
  ): Promise<{ message: string }> {
    return request<{ message: string }>(
      'POST',
      '/api/web/auth/password-reset/request',
      { body: { email } }
    );
  }

  static async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return request<{ message: string }>(
      'POST',
      '/api/web/auth/password-reset/confirm',
      { body: { token, newPassword } }
    );
  }

  static async requestEmailVerify(
    email: string
  ): Promise<{ message: string }> {
    return request<{ message: string }>(
      'POST',
      '/api/web/auth/email-verification/request',
      { body: { email } }
    );
  }

  static async confirmEmailVerify(
    token: string
  ): Promise<{ message: string }> {
    return request<{ message: string }>(
      'POST',
      '/api/web/auth/email-verification/confirm',
      { body: { token } }
    );
  }

  static async logoutAll(): Promise<{ message: string }> {
    return request<{ message: string }>('POST', '/api/web/auth/logout-all');
  }
}
