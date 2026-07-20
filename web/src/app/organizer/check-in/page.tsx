'use client';

import { QrCode } from 'lucide-react';
import { OrganizerSectionPlaceholder } from '@/features/organizer/OrganizerSectionPlaceholder';

export default function OrganizerCheckInPage() {
  return (
    <OrganizerSectionPlaceholder
      titleKey="check_in_title"
      descriptionKey="check_in_subtitle"
      icon={QrCode}
    />
  );
}