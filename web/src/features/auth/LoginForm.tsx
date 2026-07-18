'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Flame, Mail, Lock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthService } from '@/features/auth/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await AuthService.login(email, password);
      const role = data.user?.roles?.[0] ?? 'attendee';
      login(data.accessToken, role, data.user.id, data.refreshToken);
      router.push('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('login_error');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    'w-full pl-10 pr-4 py-6 rounded-xl border border-[var(--surface-border)] bg-[var(--background)]/80 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-1 focus-visible:ring-[var(--primary)] focus-visible:border-[var(--primary)]/50 transition-all text-sm';

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center relative bg-[var(--background)] px-6">
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-[var(--primary)]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-[var(--primary-dark)]/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md rounded-xl p-8 relative z-10 border border-[var(--surface-border)] bg-[var(--surface)]/95 shadow-lg">
        <CardHeader className="p-0 mb-8 flex flex-col items-center">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-extrabold text-2xl tracking-tight text-[var(--text-primary)] mb-3"
          >
            <div className="size-9 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center">
              <Flame className="size-4.5 text-[var(--on-primary)]" />
            </div>
            <span>
              Event<span className="text-[var(--primary)]">ing</span>
            </span>
          </Link>
          <CardTitle className="text-xl font-bold text-[var(--text-primary)] text-center mt-1">
            {t('login')}
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)] text-sm text-center mt-1">
            {t('login_subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl text-xs text-[var(--error)] mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <div>
              <Label className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider block mb-2">
                {t('email')}
              </Label>
              <div className="relative">
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={fieldClass}
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)]" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider block mb-2">
                {t('password')}
              </Label>
              <div className="relative">
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={fieldClass}
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)]" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 rounded-xl btn-primary-gradient text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 border-none btn-tactile font-bold text-[var(--on-primary)]"
            >
              {loading ? t('logging_in') : t('login')}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--surface-border)] text-center">
            <p className="text-[var(--text-muted)] text-xs">
              {t('no_account')}{' '}
              <Link href="/register" className="text-[var(--primary)] hover:underline font-medium">
                {t('create_account')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
