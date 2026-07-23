'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MailCheck, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandMark } from '@/components/shared/BrandMark';
import { AuthService } from '@/services/auth.service';

function VerifyEmailInner() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';
  const emailFromQuery = searchParams?.get('email') || '';
  const fromRegister = searchParams?.get('registered') === '1';

  const [email, setEmail] = useState(emailFromQuery);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(
    fromRegister ? 'ok' : 'idle'
  );
  const [message, setMessage] = useState(
    fromRegister ? t('verify_after_register') : ''
  );

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery);
  }, [emailFromQuery]);

  useEffect(() => {
    if (!token) return;
    setStatus('loading');
    AuthService.confirmEmailVerify(token)
      .then((res) => {
        setStatus('ok');
        setMessage(res.message || t('verify_success'));
      })
      .catch((err: unknown) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : t('verify_error'));
      });
  }, [token, t]);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await AuthService.requestEmailVerify(email);
      setStatus('ok');
      setMessage(res.message || t('verify_email_sent'));
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : t('verify_error'));
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center relative bg-[var(--background)] px-6">
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        {t('back_to_home')}
      </Link>

      <Card className="w-full max-w-md rounded-xl p-8 border border-[var(--surface-border)] bg-[var(--surface)]/95 shadow-lg relative z-10">
        <CardHeader className="p-0 mb-6 flex flex-col items-center">
          <Link href="/" className="mb-3">
            <BrandMark size="lg" />
          </Link>
          <div className="size-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-3">
            <MailCheck className="size-6 text-[var(--primary)]" />
          </div>
          <CardTitle className="text-xl font-bold text-[var(--text-primary)] text-center">
            {t('verify_email_title')}
          </CardTitle>
          <CardDescription className="text-sm text-[var(--text-secondary)] text-center mt-1">
            {t('verify_email_subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {token ? (
            <div className="text-center space-y-3">
              {status === 'loading' && (
                <p className="text-sm text-[var(--text-muted)]">{t('verifying')}</p>
              )}
              {status === 'ok' && (
                <p className="text-sm text-[var(--success)] font-medium">{message}</p>
              )}
              {status === 'error' && (
                <p className="text-sm text-[var(--error)]">{message}</p>
              )}
              <div className="flex flex-col items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  {t('back_to_login')}
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="size-3.5" />
                  {t('back_to_home')}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={requestLink} className="space-y-4">
              {message && (
                <p
                  className={
                    status === 'error'
                      ? 'text-xs text-[var(--error)] p-3 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30'
                      : 'text-xs text-[var(--text-secondary)] p-3 rounded-xl bg-[var(--primary)]/8 border border-[var(--primary)]/20'
                  }
                >
                  {message}
                </p>
              )}
              <div>
                <Label className="text-xs text-[var(--text-secondary)] uppercase font-semibold mb-2 block">
                  {t('email')}
                </Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  className="h-11 rounded-xl"
                />
              </div>
              <Button
                type="submit"
                disabled={status === 'loading'}
                className="w-full btn-primary-gradient rounded-xl font-bold text-[var(--on-primary)] border-none cursor-pointer"
              >
                {status === 'loading' ? t('sending') : t('send_verify_link')}
              </Button>
              <div className="flex flex-col items-center gap-2 pt-2">
                <Link
                  href="/login"
                  className="text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  {t('back_to_login')}
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="size-3.5" />
                  {t('back_to_home')}
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function VerifyEmailForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
