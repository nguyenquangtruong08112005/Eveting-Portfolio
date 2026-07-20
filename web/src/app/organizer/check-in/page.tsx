'use client';

import { Suspense } from 'react';
import { CheckInView } from '@/features/organizer/CheckInView';

export default function OrganizerCheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <div className="size-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      }
    >
      <CheckInView />
    </Suspense>
  );
}
