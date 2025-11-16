package com.tdtuer.eventing.data.network.model

// (1) Dữ liệu gửi đi cho /tickets/book (từ Postman)
data class BookTicketRequest(
    val eventId: String,
    val ticketType: String,
    val promoCode: String? = null
)
