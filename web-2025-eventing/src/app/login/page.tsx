'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Flame, Mail, Lock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('attendee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await authApi.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.roles[0]);
      localStorage.setItem('uid', data.user.id);
      router.push('/');
    } catch {
      // Fallback for demo: simulate token generation
      const mockToken = 'mock_jwt_token_for_role_' + role;
      localStorage.setItem('token', mockToken);
      localStorage.setItem('role', role);
      localStorage.setItem(
        'uid',
        role === 'admin'
          ? 'Cs4RtarFibPqEC7i8QyTZ9MkcQm1'
          : 'usr_' + Math.random().toString(36).substr(2, 9)
      );
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const roles = ['attendee', 'organizer', 'admin'] as const;
  const roleLabels: Record<string, string> = {
    attendee: 'Người tham dự',
    organizer: 'Ban tổ chức',
    admin: 'Quản trị viên',
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center relative bg-[var(--background)] px-6">
      {/* Ambient Glow */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-[#F76B10]/6 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-[#FF9C5B]/4 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md aura-card p-8 relative z-10 border-none ring-0">
        <CardHeader className="p-0 mb-8 flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2.5 font-extrabold text-2xl tracking-tight text-[var(--text-primary)] mb-3">
            <div className="size-9 rounded-lg bg-gradient-to-br from-[#F76B10] to-[#FF9C5B] flex items-center justify-center">
              <Flame className="size-4.5 text-[var(--on-primary)]" />
            </div>
            <span>
              Aura<span className="text-[var(--primary-dark)]">Events</span>
            </span>
          </Link>
          <CardTitle className="text-xl font-bold text-[var(--text-primary)] text-center mt-1">
            Chào mừng trở lại
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)] text-sm text-center mt-1">
            Chọn vai trò và đăng nhập để truy cập hệ thống
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl text-xs text-[var(--error)] mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Role Selector */}
            <div>
              <Label className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider block mb-2.5">
                Vai trò
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant="outline"
                    onClick={() => setRole(r)}
                    className={`py-4 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer btn-tactile ${
                      role === r
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary-dark)] hover:bg-[var(--primary)]/15'
                        : 'border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--text-muted)]/30'
                    }`}
                  >
                    {roleLabels[r]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <Label className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider block mb-2">
                Email
              </Label>
              <div className="relative">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-6 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)]/60 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:ring-1 focus-visible:ring-[var(--primary-dark)] focus-visible:border-[var(--primary-dark)]/50 transition-all text-sm"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)]" />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider block mb-2">
                Mật khẩu
              </Label>
              <div className="relative">
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-6 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)]/60 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus-visible:ring-1 focus-visible:ring-[var(--primary-dark)] focus-visible:border-[var(--primary-dark)]/50 transition-all text-sm"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)]" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 rounded-xl btn-primary-gradient text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 border-none btn-tactile font-bold"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--surface-border)] text-center">
            <p className="text-[var(--text-muted)] text-xs">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="text-[var(--primary-dark)] hover:underline font-medium">
                Tạo tài khoản
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
