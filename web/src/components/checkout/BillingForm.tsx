'use client';

import { User, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BillingFormProps {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
}

export function BillingForm({ name, setName, email, setEmail, phone, setPhone }: BillingFormProps) {
  const t = useTranslations('checkout');

  return (
    <div className="glass-card rounded-2xl p-6 bg-[#1E212B] border border-white/5 space-y-5">
      <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
        <User className="size-5 text-[var(--primary)]" />
        {t('billing_title')}
      </h3>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <Label className="text-xs text-zinc-400 uppercase font-bold tracking-wider block mb-2">
            {t('full_name')}
          </Label>
          <div className="relative">
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full pl-10 pr-4 py-5 rounded-xl border border-white/10 bg-[#131313]/60 text-white placeholder-zinc-500 focus-visible:ring-1 focus-visible:ring-[var(--primary)] transition-all text-xs"
            />
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-zinc-500" />
          </div>
        </div>

        {/* Email */}
        <div>
          <Label className="text-xs text-zinc-400 uppercase font-bold tracking-wider block mb-2">
            {t('email')}
          </Label>
          <div className="relative">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full pl-10 pr-4 py-5 rounded-xl border border-white/10 bg-[#131313]/60 text-white placeholder-zinc-500 focus-visible:ring-1 focus-visible:ring-[var(--primary)] transition-all text-xs"
            />
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-zinc-500" />
          </div>
          <span className="text-[10px] text-zinc-500 mt-1.5 block">
            {t('email_hint')}
          </span>
        </div>

        {/* Phone */}
        <div>
          <Label className="text-xs text-zinc-400 uppercase font-bold tracking-wider block mb-2">
            {t('phone')}
          </Label>
          <div className="relative">
            <Input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              className="w-full pl-10 pr-4 py-5 rounded-xl border border-white/10 bg-[#131313]/60 text-white placeholder-zinc-500 focus-visible:ring-1 focus-visible:ring-[var(--primary)] transition-all text-xs"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">📞</span>
          </div>
        </div>
      </div>
    </div>
  );
}
