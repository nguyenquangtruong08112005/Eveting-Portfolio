package com.tdtuer.eventing_organizer.domain.usecase.payment

import com.tdtuer.eventing_organizer.data.repository.TicketRepository
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.model.Ticket
import javax.inject.Inject

class BookTicketUseCase @Inject constructor(
    private val ticketRepository: TicketRepository
) {
    suspend operator fun invoke(
        eventId: String,
        ticketType: String,
        promoCode: String? = null
    ): Result<Ticket> {
        return ticketRepository.bookTicket(eventId, ticketType, promoCode)
    }
}