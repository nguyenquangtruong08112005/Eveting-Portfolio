const STATUS_PRIORITY = {
  'paid': 1,
  'pending': 2,
  'checkedIn': 3,
  'cancelled': 4
};

function sortTicketsByPriorityAndDate(tickets) {
  return tickets.sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.status] || 99;
    const priorityB = STATUS_PRIORITY[b.status] || 99;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return b.purchaseDate - a.purchaseDate;
  });
}

function buildPagination(totalItems, page, limit) {
  const totalPages = Math.ceil(totalItems / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    totalPages,
    startIndex,
    endIndex,
    meta: {
      currentPage: page,
      limit: limit,
      totalPages: totalPages,
      totalItems: totalItems
    }
  };
}

function mapTicketWithEvent(ticketData, eventData) {
  let eventInfo = null;

  if (eventData) {
    eventInfo = {
      id: eventData.id,
      name: eventData.name,
      date: eventData.date,
      imageUrl: eventData.imageUrl,
      venueName: eventData.venueName,
      city: eventData.city,
      status: eventData.status
    };
  } else {
    eventInfo = { id: ticketData.eventId, name: "Unknown Event", status: "deleted" };
  }

  return {
    id: ticketData.id,
    status: ticketData.status,
    type: ticketData.type,
    price: ticketData.price,
    seat: ticketData.seat,
    qrCode: ticketData.qrCode,
    purchaseDate: ticketData.purchaseDate,
    event: eventInfo
  };
}

function mapTicketDetailResponse(ticketData, eventData, venueData) {
  return {
    ticket: ticketData,
    event: {
      name: eventData.name,
      date: eventData.date,
      endDate: eventData.endDate,
      bannerUrl: eventData.bannerUrl,
      eventType: eventData.eventType,
      onlineUrl: eventData.onlineUrl,
      city: eventData.city,
      venueName: eventData.venueName,
    },
    venue: venueData ? {
      name: venueData.name,
      addressDetails: venueData.addressDetails,
      location: venueData.location
    } : null
  };
}

module.exports = {
  STATUS_PRIORITY,
  sortTicketsByPriorityAndDate,
  buildPagination,
  mapTicketWithEvent,
  mapTicketDetailResponse
};
