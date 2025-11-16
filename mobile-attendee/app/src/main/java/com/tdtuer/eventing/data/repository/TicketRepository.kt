// Trong file: data/repository/TicketRepository.kt
package com.tdtuer.eventing.data.repository

import androidx.compose.ui.graphics.ImageBitmap
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Ticket

interface TicketRepository {

    // Các hàm đã di chuyển từ EventRepository
    suspend fun bookTicket(
        eventId: String,
        ticketType: String,
        promoCode: String?
    ): Result<Ticket>

    suspend fun createZaloPayOrder(
        ticketId: String
    ): Result<CreatePaymentOrderResponse>

    suspend fun getTicketDetails(ticketId: String): Result<DetailedTicket>

    // Hàm mới của chúng ta
    suspend fun saveImageToGallery(imageBitmap: ImageBitmap, fileName: String): Result<Unit>
}