'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthService } from '@/features/auth/api';
import { useTranslations } from 'next-intl';
import { BrandMark } from '@/components/shared/BrandMark';

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fieldClass =
    'w-full pl-10 pr-4 py-6 rounded-xl border border-[var(--surface-border)] bg-[var(--background)]/80 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-1 focus-visible:ring-[var(--primary)] focus-visible:border-[var(--primary)]/50 transition-all text-sm';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Support ?role=organizer from "Tạo sự kiện" CTA; default to attendee (user)
      const params = new URLSearchParams(
        typeof window !== 'undefined' ? window.location.search : ''
      );
      const requestedRole = params.get('role');
      const role = requestedRole === 'organizer' ? 'organizer' : 'user';
      await AuthService.register(name, email, password, role);
      router.push('/login');
    } catch (err: unknown) {
      const message =
        (err as { message?: string; response?: { data?: { message?: string } } })?.message ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : null) ||
        t('register_error');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center relative bg-[var(--background)] px-6">
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-[var(--primary)]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-[var(--primary-dark)]/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md rounded-xl p-8 relative z-10 border border-[var(--surface-border)] bg-[var(--surface)]/95 shadow-lg">
        <CardHeader className="p-0 mb-8 flex flex-col items-center">
          <Link href="/" className="mb-3">
            <BrandMark size="lg" />
          </Link>
          <CardTitle className="text-xl font-bold text-[var(--text-primary)] text-center mt-1">
            {t('create_account')}
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)] text-sm text-center mt-1">
            {t('register_subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl text-xs text-[var(--error)] mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <Label className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider block mb-2">
                {t('full_name')}
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('name_placeholder')}
                  className={fieldClass}
                  autoComplete="name"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider block mb-2">
                {t('email')}
              </Label>
              <div className="relative">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  className={fieldClass}
                  autoComplete="email"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('password_placeholder')}
                  className={fieldClass}
                  autoComplete="new-password"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 rounded-xl btn-primary-gradient text-sm font-bold text-[var(--on-primary)] border-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? t('registering') || 'Creating…' : t('create_account')}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--surface-border)] text-center">
            <p className="text-[var(--text-muted)] text-xs">
              {t('have_account') || 'Already have an account?'}{' '}
              <Link href="/login" className="text-[var(--primary)] hover:underline font-medium">
                {t('login')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
