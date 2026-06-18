// API service layer — single source of truth for all backend communication
// Eliminates hardcoded fetch URLs scattered across page components

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  token?: string | null;
  body?: unknown;
}

async function request<T>(method: RequestMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.message || `API error: ${res.status}`);
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; roles: string[]; name?: string } }>(
      'POST', '/auth/login', { body: { email, password } }
    ),

  register: (name: string, email: string, password: string, roles: string[]) =>
    request<{ message: string }>(
      'POST', '/auth/register', { body: { name, email, password, roles } }
    ),
};

// ── Events ────────────────────────────────────────────────────────────
export const eventsApi = {
  list: () =>
    request<{ events: import('@/types').Event[] }>('GET', '/events'),

  getById: (id: string) =>
    request<import('@/types').Event>('GET', `/events/${id}`),
};

// ── Tickets & Seating ─────────────────────────────────────────────────
// Routes are under /tickets/* — NOT /web/tickets/* (BFF not implemented yet)
export const ticketsApi = {
  holdSeat: (eventId: string, seatId: string, token: string) =>
    request<{ message: string }>(
      'POST', '/tickets/hold-seat', { token, body: { eventId, seatId } }
    ),

  releaseSeat: (eventId: string, seatId: string, token: string) =>
    request<{ message: string }>(
      'POST', '/tickets/release-seat', { token, body: { eventId, seatId } }
    ),

  bookHeldSeats: (eventId: string, seatIds: string[], token: string) =>
    request<{ message: string; tickets?: unknown[] }>(
      'POST', '/tickets/book-held-seats', { token, body: { eventId, seatIds } }
    ),

  getUserTickets: (token: string) =>
    request<{ tickets: import('@/types').Ticket[] }>('GET', '/tickets', { token }),
};

// ── Organizer ─────────────────────────────────────────────────────────
export const organizerApi = {
  getLedger: (token: string) =>
    request<{ entries: import('@/types').LedgerEntry[] }>(
      'GET', '/organizer/ledger', { token }
    ),
};

// ── Admin ─────────────────────────────────────────────────────────────
export const adminApi = {
  getPendingEvents: (token: string) =>
    request<{ events: import('@/types').Event[] }>(
      'GET', '/admin/events/pending', { token }
    ),

  approveEvent: (eventId: string, token: string) =>
    request<{ message: string }>(
      'POST', `/admin/events/${eventId}/approve`, { token }
    ),

  rejectEvent: (eventId: string, reason: string, token: string) =>
    request<{ message: string }>(
      'POST', `/admin/events/${eventId}/reject`, { token, body: { reason } }
    ),
};
