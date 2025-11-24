package com.tdtuer.eventing_organizer.domain.usecase.payment

import com.tdtuer.eventing_organizer.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing_organizer.data.repository.TicketRepository
import com.tdtuer.eventing_organizer.domain.model.Result
import javax.inject.Inject


class CreateZaloPayOrderUseCase @Inject constructor(
    private val ticketRepository: TicketRepository
){
    suspend operator fun invoke(
        ticketId: String
    ): Result<CreatePaymentOrderResponse> {
        return ticketRepository.createZaloPayOrder(ticketId = ticketId)
    }
}