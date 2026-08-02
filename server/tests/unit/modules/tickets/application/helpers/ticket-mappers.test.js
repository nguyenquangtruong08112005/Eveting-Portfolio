const {
  sortTicketsByPriorityAndDate,
  buildPagination,
  mapTicketWithEvent,
  mapTicketDetailResponse,
} = require('@/modules/tickets/application/helpers/ticket-mappers');

describe('sortTicketsByPriorityAndDate', () => {
  it('sorts by status priority then purchaseDate descending', () => {
    const tickets = [
      { status: 'cancelled', purchaseDate: 100 },
      { status: 'paid', purchaseDate: 300 },
      { status: 'pending', purchaseDate: 200 },
      { status: 'paid', purchaseDate: 400 },
    ];
    const sorted = sortTicketsByPriorityAndDate(tickets);
    expect(sorted[0].status).toBe('paid');
    expect(sorted[0].purchaseDate).toBe(400);
    expect(sorted[1].status).toBe('paid');
    expect(sorted[1].purchaseDate).toBe(300);
    expect(sorted[2].status).toBe('pending');
    expect(sorted[3].status).toBe('cancelled');
  });

  it('handles empty array', () => {
    expect(sortTicketsByPriorityAndDate([])).toEqual([]);
  });

  it('puts unknown status last', () => {
    const tickets = [
      { status: 'unknown', purchaseDate: 100 },
      { status: 'paid', purchaseDate: 200 },
    ];
    const sorted = sortTicketsByPriorityAndDate(tickets);
    expect(sorted[0].status).toBe('paid');
    expect(sorted[1].status).toBe('unknown');
  });
});

describe('buildPagination', () => {
  it('computes pagination metadata', () => {
    const result = buildPagination(25, 2, 10);
    expect(result.totalPages).toBe(3);
    expect(result.startIndex).toBe(10);
    expect(result.endIndex).toBe(20);
    expect(result.meta.currentPage).toBe(2);
    expect(result.meta.limit).toBe(10);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.totalItems).toBe(25);
  });

  it('handles zero items', () => {
    const result = buildPagination(0, 1, 10);
    expect(result.totalPages).toBe(0);
    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(10);
    expect(result.meta.totalItems).toBe(0);
  });

  it('handles single page', () => {
    const result = buildPagination(5, 1, 10);
    expect(result.totalPages).toBe(1);
    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(10);
    expect(result.meta.totalItems).toBe(5);
  });
});

describe('mapTicketWithEvent', () => {
  const ticket = {
    id: 'tkt_1', status: 'paid', type: 'vip', price: 100, seat: null,
    qrCode: 'qr', purchaseDate: 1000, eventId: 'evt_1',
  };

  it('includes event info when eventData present', () => {
    const eventData = { id: 'evt_1', name: 'Concert', date: '2026-01-01', imageUrl: 'img.jpg', venueName: 'Hall', city: 'NYC', status: 'active' };
    const result = mapTicketWithEvent(ticket, eventData);
    expect(result.event.name).toBe('Concert');
    expect(result.event.city).toBe('NYC');
    expect(result.id).toBe('tkt_1');
  });

  it('falls back to Unknown Event when eventData is null', () => {
    const result = mapTicketWithEvent(ticket, null);
    expect(result.event.name).toBe('Unknown Event');
    expect(result.event.status).toBe('deleted');
  });
});

describe('mapTicketDetailResponse', () => {
  const ticket = { id: 'tkt_1', status: 'paid', type: 'vip', price: 100, seat: 'A1', qrCode: 'qr', purchaseDate: 1000, userId: 'u1', eventId: 'evt_1', quantity: 2 };
  const eventData = { id: 'evt_1', name: 'Concert', date: '2026-01-01', endDate: null, imageUrl: 'img.jpg', bannerUrl: null, eventType: 'music', onlineUrl: null, city: 'NYC', venueName: 'Hall', status: 'active' };

  it('includes ticket + event + venue data', () => {
    const venueData = { name: 'Hall', addressDetails: '123 St', location: { lat: 1, lng: 2 } };
    const result = mapTicketDetailResponse(ticket, eventData, venueData);
    expect(result.id).toBe('tkt_1');
    expect(result.event.name).toBe('Concert');
    expect(result.venue.name).toBe('Hall');
    expect(result.ticket).toBe(ticket);
  });

  it('sets venue to null when no venueData', () => {
    const result = mapTicketDetailResponse(ticket, eventData, null);
    expect(result.venue).toBeNull();
  });
});
