package com.tdtuer.eventing.domain.usecase.payment

import com.tdtuer.eventing.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing.data.repository.TicketRepository
import com.tdtuer.eventing.domain.model.Result
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