package com.tdtuer.eventing.domain.model

data class Ticket(
    val id: String = "",
    val eventId: String = "",
    val userId: String = "",
    val type: String = "",
    val price: Double = 0.0,
    val seat: String = "",
    val qrCode: String = "",  // Generate on-fly nếu cần
    val status: String = "pending",
    val purchaseDate: Long = 0L,
    val groupId: String = "",
    val collaboratorId: String = ""
) {
    fun isPaid() = status == "paid"  // Helper cho thanh toán
}