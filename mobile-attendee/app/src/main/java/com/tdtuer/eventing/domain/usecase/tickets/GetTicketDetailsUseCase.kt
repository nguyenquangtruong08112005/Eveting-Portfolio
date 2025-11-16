// Trong file: domain/usecase/tickets/GetTicketDetailsUseCase.kt
package com.tdtuer.eventing.domain.usecase.tickets

import com.tdtuer.eventing.data.repository.TicketRepository // <-- SỬA THÀNH TicketRepository
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.domain.model.Result
import javax.inject.Inject

class GetTicketDetailsUseCase @Inject constructor(
    private val repository: TicketRepository // <-- SỬA THÀNH TicketRepository
) {
    suspend operator fun invoke(ticketId: String): Result<DetailedTicket> {
        return repository.getTicketDetails(ticketId)
    }
}