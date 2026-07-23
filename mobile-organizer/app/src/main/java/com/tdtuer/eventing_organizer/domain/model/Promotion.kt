package com.tdtuer.eventing_organizer.domain.model

data class Promotion(
    val id: String = "",
    val code: String = "",
    val discountValue: Double = 0.0,
    val discountType: String = "amount", // "percent" hoặc "amount"
    val description: String = "",
    val usageLimit: Int = 100,
    val usedCount: Int = 0,
    val validFrom: Long = 0L,
    val validUntil: Long = 0L,
    val minTicketQuantity: Int = 1,
    val isPublic: Boolean = false,
    val eventId: String? = null // null nếu áp dụng toàn bộ
) {
    fun isActive(): Boolean {
        val now = System.currentTimeMillis()
        return now in validFrom..validUntil && usedCount < usageLimit
    }
}