'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthState {
  token: string | null;
  role: string | null;
  uid: string | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    role: null,
    uid: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const uid = localStorage.getItem('uid');
    setAuth({
      token,
      role,
      uid,
      isAuthenticated: !!token,
    });
  }, []);

  const login = useCallback((token: string, role: string, uid: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('uid', uid);
    setAuth({ token, role, uid, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('uid');
    setAuth({ token: null, role: null, uid: null, isAuthenticated: false });
    router.push('/login');
  }, [router]);

  return { ...auth, login, logout };
}
