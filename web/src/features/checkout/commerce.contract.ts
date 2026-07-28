import type { EventCustomQuestion } from '@/types';

export interface CheckoutItem { ticketType: string; quantity: number; }
export interface CheckoutAttendee { name: string; email: string; answers: Record<string, string | string[]>; }
export interface CheckoutDraft {
  eventId: string;
  items: CheckoutItem[];
  promoCode?: string;
  attendees: CheckoutAttendee[];
  seatHold?: { performanceId: string; holdToken: string; seatIds: string[] };
}

export function validateCheckoutQuestions(questions: EventCustomQuestion[], answers: Record<string, string | string[]>): string | null {
  for (const question of questions) {
    if (!question.id) continue;
    const answer = answers[question.id];
    const empty = Array.isArray(answer) ? answer.length === 0 : !answer?.trim();
    if (question.isRequired && empty) return question.id;
    if (question.questionType === 'single_choice' && typeof answer === 'string' && answer && !question.options.includes(answer)) return question.id;
    if (question.questionType === 'multi_choice' && Array.isArray(answer) && answer.some((value) => !question.options.includes(value))) return question.id;
  }
  return null;
}

export function buildCheckoutPayload(draft: CheckoutDraft) {
  return {
    eventId: draft.eventId,
    items: draft.items.map((item) => ({ ticketType: item.ticketType, quantity: item.quantity })),
    promoCode: draft.promoCode,
    attendees: draft.attendees,
    seatHold: draft.seatHold,
  };
}
