package com.tdtuer.eventing.domain.model

data class Event(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val artistIds: List<String> = emptyList(),
    val category: String = "",
    val date: Long = 0L,
    val location: String = "",
    val venueDetails: Map<String, Any> = emptyMap(),  // lat: Double, long: Double, nearby: List<String>
    val ticketTypes: Map<String, Map<String, Any>> = emptyMap(),  // vip: {price: Double, quantity: Int, available: Int}
    val seatMap: Map<String, Boolean> = emptyMap(),
    val videoUrl: String = "",
    val isOutdoor: Boolean = false,
    val organizerId: String = "",
    val hotScore: Double = 0.0,
    val revenue: Double = 0.0
) {
    fun getAvailableSeats(): List<String> = seatMap.filterValues { it }.keys.toList()  // Helper cho chọn ghế
}