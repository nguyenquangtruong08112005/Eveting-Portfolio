import type { Event } from '@/types';

/**
 * Reviews are allowed only when:
 * 1) the event has ended (finished/cancelled status OR end of schedule in the past), AND
 * 2) it is a multi-performance / repeat-style event
 *    (multiple ticket types as "shows", recurring rule, multi-day endDate, or tag hints).
 */
export function isEventEnded(event: Event | null | undefined): boolean {
  if (!event) return false;
  const status = (event.status || event.lifecycleStatus || '').toLowerCase();
  if (status === 'finished' || status === 'cancelled' || status === 'ended') {
    return true;
  }
  const endTs = Number(event.endDate || event.date || 0);
  if (!endTs || Number.isNaN(endTs)) return false;
  // end of day grace: treat as ended once start/end timestamp is past
  return endTs < Date.now();
}

export function isMultiPerformanceOrRepeat(event: Event | null | undefined): boolean {
  if (!event) return false;

  if (event.recurringRule) return true;

  const tags = (event.tags || []).map((t) => t.toLowerCase());
  if (tags.some((t) => /repeat|recurring|series|multi|performance|show/.test(t))) {
    return true;
  }

  // Multiple ticket types often map to multiple performances / zones / shows
  const typeKeys = event.ticketTypes ? Object.keys(event.ticketTypes) : [];
  if (typeKeys.length >= 2) return true;

  // Multi-day event (endDate after date by > 12h)
  if (event.endDate && event.date) {
    const span = Number(event.endDate) - Number(event.date);
    if (span > 12 * 60 * 60 * 1000) return true;
  }

  if (Array.isArray(event.performances) && event.performances.length > 1) {
    return true;
  }

  return false;
}

export function canWriteEventReview(event: Event | null | undefined): boolean {
  return isEventEnded(event) && isMultiPerformanceOrRepeat(event);
}

export function reviewUnavailableReason(
  event: Event | null | undefined
): 'not_ended' | 'not_multi' | 'ok' {
  if (!isEventEnded(event)) return 'not_ended';
  if (!isMultiPerformanceOrRepeat(event)) return 'not_multi';
  return 'ok';
}
