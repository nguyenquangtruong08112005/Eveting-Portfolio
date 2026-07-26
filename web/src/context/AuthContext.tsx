'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { AuthState, AuthContextType } from '@/types/auth';
import { request } from '@/services/apiClient';

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
    let isMounted = true;
    (async () => {
      try {
        const user = await request<{ id: string; roles?: string[] }>('GET', '/api/web/users/me', {
          allowAnonymous: true,
        });
        if (isMounted && user && user.id) {
          const role = user.roles?.[0] || 'user';
          localStorage.setItem('role', role);
          localStorage.setItem('uid', user.id);
          setState({
            token: null,
            role,
            uid: user.id,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      } catch {
        /* Not logged in or cookie expired */
      }
      if (isMounted) {
        localStorage.removeItem('role');
        localStorage.removeItem('uid');
        setState({
          token: null,
          role: null,
          uid: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback((_token: string, role: string, uid: string, _refreshToken?: string) => {
    localStorage.setItem('role', role);
    localStorage.setItem('uid', uid);
    setState({
      token: null,
      role,
      uid,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await request('POST', '/api/web/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('role');
    localStorage.removeItem('uid');
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
