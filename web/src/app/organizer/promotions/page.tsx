'use client';

import { TicketPercent } from 'lucide-react';
import { OrganizerSectionPlaceholder } from '@/features/organizer/OrganizerSectionPlaceholder';

export default function OrganizerPromotionsPage() {
  return (
    <OrganizerSectionPlaceholder
      titleKey="promotions_title"
      descriptionKey="promotions_subtitle"
      icon={TicketPercent}
    />
  );
}
