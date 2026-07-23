'use client';

import { User, Mail, Phone } from 'lucide-react';
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

const fieldClass =
  'w-full pl-10 pr-4 py-5 rounded-xl border border-[var(--surface-border)] bg-[var(--background)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:border-[var(--primary)] transition-all text-xs';

export function BillingForm({ name, setName, email, setEmail, phone, setPhone }: BillingFormProps) {
  const t = useTranslations('checkout');

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--surface-border)] pb-3">
        <User className="size-5 text-[var(--primary)]" />
        {t('billing_title')}
      </h3>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <Label
            htmlFor="billing-name"
            className="text-xs text-[var(--text-secondary)] uppercase font-bold tracking-wider block mb-2"
          >
            {t('full_name')}
          </Label>
          <div className="relative">
            <Input
              id="billing-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className={fieldClass}
              autoComplete="name"
            />
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-[var(--text-muted)]" />
          </div>
        </div>

        {/* Email */}
        <div>
          <Label
            htmlFor="billing-email"
            className="text-xs text-[var(--text-secondary)] uppercase font-bold tracking-wider block mb-2"
          >
            {t('email')}
          </Label>
          <div className="relative">
            <Input
              id="billing-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className={fieldClass}
              autoComplete="email"
            />
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-[var(--text-muted)]" />
          </div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1.5 block">{t('email_hint')}</span>
        </div>

        {/* Phone */}
        <div>
          <Label
            htmlFor="billing-phone"
            className="text-xs text-[var(--text-secondary)] uppercase font-bold tracking-wider block mb-2"
          >
            {t('phone')}
          </Label>
          <div className="relative">
            <Input
              id="billing-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901234567"
              className={fieldClass}
              autoComplete="tel"
            />
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--text-muted)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
