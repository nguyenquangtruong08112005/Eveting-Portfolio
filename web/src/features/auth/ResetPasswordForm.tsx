'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandMark } from '@/components/shared/BrandMark';
import { AuthService } from '@/services/auth.service';

function ResetPasswordFormInner() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fieldClass =
    'w-full pl-10 pr-4 py-6 rounded-xl border border-[var(--surface-border)] bg-[var(--background)]/80 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-1 focus-visible:ring-[var(--primary)] text-sm';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError(t('reset_token_missing'));
      return;
    }
    if (password.length < 6) {
      setError(t('password_placeholder'));
      return;
    }
    if (password !== confirm) {
      setError(t('password_mismatch'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await AuthService.confirmPasswordReset(token, password);
      router.push('/login?reset=1');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('reset_confirm_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center relative bg-[var(--background)] px-6">
      <Card className="w-full max-w-md rounded-xl p-8 relative z-10 border border-[var(--surface-border)] bg-[var(--surface)]/95 shadow-lg">
        <CardHeader className="p-0 mb-8 flex flex-col items-center">
          <Link href="/" className="mb-3">
            <BrandMark size="lg" />
          </Link>
          <CardTitle className="text-xl font-bold text-[var(--text-primary)] text-center">
            {t('reset_password_title')}
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)] text-sm text-center mt-1">
            {t('reset_password_subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={onSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl text-xs text-[var(--error)]">
                {error}
              </div>
            )}
            <div>
              <Label className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider block mb-2">
                {t('new_password')}
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
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider block mb-2">
                {t('confirm_password')}
              </Label>
              <div className="relative">
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t('password_placeholder')}
                  className={fieldClass}
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 rounded-xl btn-primary-gradient font-bold text-[var(--on-primary)] border-none cursor-pointer"
            >
              {loading ? t('saving') : t('save_new_password')}
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  );
}
