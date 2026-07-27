// Trong file: data/repository/TicketRepository.kt
package com.tdtuer.eventing.data.repository

import androidx.compose.ui.graphics.ImageBitmap
import com.tdtuer.eventing.data.network.model.CheckPaymentStatusResponse
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing.data.network.model.UserTicketDto
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Ticket
import com.tdtuer.eventing.ui.screens.ticket.SaveRequest
import kotlinx.coroutines.flow.Flow

interface TicketRepository {

    // Các hàm đã di chuyển từ EventRepository
    suspend fun bookTicket(
        eventId: String,
        ticketType: String,
        quantity: Int,
        promoCode: String?
    ): Result<Ticket>

    suspend fun createZaloPayOrder(
        ticketId: String
    ): Result<CreatePaymentOrderResponse>

    suspend fun checkPaymentStatus(
        ticketId: String
    ): Result<CheckPaymentStatusResponse>

    suspend fun getTicketDetails(ticketId: String): Result<DetailedTicket>

    // Hàm mới của chúng ta
    suspend fun saveTicketImages(request: SaveRequest): Result<Unit>

    suspend fun getUserTickets(page: Int, limit: Int): Flow<Result<List<UserTicketDto>>>
}