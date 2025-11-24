package com.tdtuer.eventing_organizer.data.network.model

data class TicketDto(
    val id: String,
    val eventId: String,
    val userId: String,
    val type: String,
    val price: Double,
    val qrCode: String,
    val purchaseDate: Long,
    val status: String
    // Các trường khác (organizerId, seat, ...) có thể thêm nếu cần
)