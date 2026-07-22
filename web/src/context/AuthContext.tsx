'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { AuthState, AuthContextType } from '@/types/auth';

export type { AuthState, AuthContextType };

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    role: null,
    uid: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const uid = localStorage.getItem('uid');
    setState({
      token,
      role,
      uid,
      isAuthenticated: !!token,
      isLoading: false,
    });
  }, []);

  const login = useCallback((token: string, role: string, uid: string, refreshToken?: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('uid', uid);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    setState({
      token,
      role,
      uid,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('uid');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    setState({
      token: null,
      role: null,
      uid: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

