'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Flame, Mail, Lock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthService } from '@/services/auth.service';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';



export default function LoginPage() {
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
      login(data.accessToken, data.user.roles[0], data.user.id, data.refreshToken);
      router.push('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || t('login_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center relative bg-[var(--background)] px-6">
      {/* Ambient Glow */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-[#FF8F66]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-[#FF7043]/4 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md glass-card rounded-xl p-8 relative z-10 border border-white/10 bg-[#18181A]/80">
        <CardHeader className="p-0 mb-8 flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2.5 font-extrabold text-2xl tracking-tight text-[var(--text-primary)] mb-3">
            <div className="size-9 rounded-lg bg-gradient-to-br from-[#FF8F66] to-[#FF7043] flex items-center justify-center">
              <Flame className="size-4.5 text-[#12141A]" />
            </div>
            <span>
              Event<span className="text-[var(--primary)]">ing</span>
            </span>
          </Link>
          <CardTitle className="text-xl font-bold text-[var(--text-primary)] text-center mt-1">
            {t('login')}
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm text-center mt-1">
            {t('login_subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl text-xs text-[var(--error)] mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
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
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-6 rounded-xl border border-white/10 bg-[#131313]/60 text-[var(--text-primary)] placeholder-zinc-500 focus-visible:ring-1 focus-visible:ring-[var(--primary)] focus-visible:border-[var(--primary)]/50 transition-all text-sm"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label className="text-xs text-[var(--text-secondary)] uppercase font-semibold tracking-wider block mb-2">
                {t('password')}
              </Label>
              <div className="relative">
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-6 rounded-xl border border-white/10 bg-[#131313]/60 text-[var(--text-primary)] placeholder-zinc-500 focus-visible:ring-1 focus-visible:ring-[var(--primary)] focus-visible:border-[var(--primary)]/50 transition-all text-sm"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 rounded-xl btn-primary-gradient text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 border-none btn-tactile font-bold text-[#12141A]"
            >
              {loading ? t('logging_in') : t('login')}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          {/* Demo hint */}
          <div className="mt-5 p-3 bg-[#131313]/40 rounded-xl border border-white/10">
            <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
              <span className="font-semibold text-zinc-400">{t('demo')}</span>{' '}
              {t('admin_hint')} · {t('org_hint')}
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-zinc-500 text-xs">
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
