package com.tdtuer.eventing.domain.usecase.payment

import com.tdtuer.eventing.data.network.model.CheckPaymentStatusResponse
import com.tdtuer.eventing.data.repository.TicketRepository
import com.tdtuer.eventing.domain.model.Result
import javax.inject.Inject

class CheckPaymentStatusUseCase @Inject constructor(
    private val ticketRepository: TicketRepository
) {
    suspend operator fun invoke(
        ticketId: String
    ): Result<CheckPaymentStatusResponse> {
        return ticketRepository.checkPaymentStatus(ticketId = ticketId)
    }
}
