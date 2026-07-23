package com.tdtuer.eventing_organizer.data.network.model

data class TicketDetailResponse(
    val ticket: TicketDto,
    val event: EventSummaryDto,
    val venue: VenueSummaryDto
)