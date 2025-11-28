package com.tdtuer.eventing.domain.usecase.payment

import com.tdtuer.eventing.data.repository.TicketRepository
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Ticket
import javax.inject.Inject

class BookTicketUseCase @Inject constructor(
    private val ticketRepository: TicketRepository
) {
    suspend operator fun invoke(
        eventId: String,
        ticketType: String,
        promoCode: String? = null,
        quantity: Int = 1,
    ): Result<Ticket> {
        return ticketRepository.bookTicket(eventId, ticketType,quantity, promoCode)
    }
}