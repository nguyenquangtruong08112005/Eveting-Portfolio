'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandMark } from '@/components/shared/BrandMark';
import { AuthService } from '@/services/auth.service';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const fieldClass =
    'w-full pl-10 pr-4 py-6 rounded-xl border border-[var(--surface-border)] bg-[var(--background)]/80 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-1 focus-visible:ring-[var(--primary)] text-sm';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await AuthService.requestPasswordReset(email);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('reset_request_error'));
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
            {t('forgot_password_title')}
          </CardTitle>
          <CardDescription className="text-[var(--text-secondary)] text-sm text-center mt-1">
            {t('forgot_password_subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {done ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-[var(--text-secondary)]">{t('reset_email_sent')}</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline"
              >
                <ArrowLeft className="size-3.5" />
                {t('back_to_login')}
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl text-xs text-[var(--error)]">
                  {error}
                </div>
              )}
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
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)] pointer-events-none" />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-6 rounded-xl btn-primary-gradient font-bold text-[var(--on-primary)] border-none cursor-pointer"
              >
                {loading ? t('sending') : t('send_reset_link')}
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
              <p className="text-center text-xs text-[var(--text-muted)]">
                <Link href="/login" className="text-[var(--primary)] font-medium hover:underline">
                  {t('back_to_login')}
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
