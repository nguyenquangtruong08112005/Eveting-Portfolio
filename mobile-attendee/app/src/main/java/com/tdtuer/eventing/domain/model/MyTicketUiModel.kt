package com.tdtuer.eventing.domain.model

import androidx.compose.ui.graphics.Color

data class MyTicketUiModel(
    val ticketId: String,
    val eventId: String,
    val eventName: String,
    val eventImageUrl: String,
    val fullDate: String,
    val fullTime: String,
    val location: String,
    val ticketType: String,
    val status: TicketStatus,
    val price: Double,
    val eventTimestamp: Long // <-- THÊM TRƯỜNG NÀY
)

enum class TicketStatus(val label: String, val color: Long) {
    PAID("Success", 0xFF4CAF50),      // Green - English label
    PENDING("Pending", 0xFFFFC107),   // Amber - English label
    CANCELLED("Cancelled", 0xFFF44336), // Red - English label
    CHECKED_IN("Used", 0xFF2196F3),   // Blue - English label
    UNKNOWN("Other", 0xFF9E9E9E);

    companion object {
        fun fromString(status: String?): TicketStatus = when(status?.lowercase()) {
            "paid", "success" -> PAID
            "pending" -> PENDING
            "cancelled", "failed" -> CANCELLED
            "checkedin" -> CHECKED_IN
            else -> UNKNOWN
        }
    }
}