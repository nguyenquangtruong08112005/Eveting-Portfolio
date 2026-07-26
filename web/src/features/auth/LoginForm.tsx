'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthService } from '@/features/auth/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import { BrandMark } from '@/components/shared/BrandMark';
import { applyAuthSession } from './session';
import { SocialAuthButtons } from './SocialAuthButtons';

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
      applyAuthSession(data, login, router);
    } catch (err: unknown) {
      let message = t('login_error');
      if (err instanceof Error && err.message && err.message !== '[object Object]') {
        message = err.message;
      } else if (err && typeof err === 'object') {
        const e = err as { message?: unknown; body?: { error?: { message?: string }; message?: string } };
        const nested =
          (typeof e.message === 'string' && e.message) ||
          e.body?.error?.message ||
          e.body?.message;
        if (nested && typeof nested === 'string' && nested !== '[object Object]') {
          message = nested;
        }
      }
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

      <Link
        href="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        {t('back_to_home')}
      </Link>

      <Card className="w-full max-w-md rounded-xl p-8 relative z-10 border border-[var(--surface-border)] bg-[var(--surface)]/95 shadow-lg">
        <CardHeader className="p-0 mb-8 flex flex-col items-center">
          <Link href="/" className="mb-3">
            <BrandMark size="lg" />
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
                  placeholder={t('email_placeholder')}
                  className={fieldClass}
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)] pointer-events-none" />
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
                  placeholder={t('password_placeholder')}
                  className={fieldClass}
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            <div className="flex justify-end -mt-2">
              <Link
                href="/forgot-password"
                className="text-[11px] font-semibold text-[var(--primary)] hover:underline cursor-pointer"
              >
                {t('forgot_password')}
              </Link>
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

          <div className="mt-5 space-y-2.5">
            <p className="text-[10px] text-center text-[var(--text-muted)] uppercase tracking-wider font-bold">
              {t('or_continue_with')}
            </p>
            <SocialAuthButtons
              onSuccess={(data) => applyAuthSession(data, login, router)}
              onError={(msg) => setError(msg)}
              loading={loading}
              setLoading={setLoading}
            />
          </div>

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
