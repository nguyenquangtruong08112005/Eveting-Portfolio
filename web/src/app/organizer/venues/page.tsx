'use client';

import { MapPin } from 'lucide-react';
import { OrganizerSectionPlaceholder } from '@/features/organizer/OrganizerSectionPlaceholder';

export default function OrganizerVenuesPage() {
  return (
    <OrganizerSectionPlaceholder
      titleKey="venues_title"
      descriptionKey="venues_subtitle"
      icon={MapPin}
    />
  );
}
