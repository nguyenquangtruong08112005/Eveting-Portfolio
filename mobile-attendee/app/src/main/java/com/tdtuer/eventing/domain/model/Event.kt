package com.tdtuer.eventing.domain.model

data class Event(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val featuredProfileIds: List<String> = emptyList(),
    val category: List<String> = emptyList(),
    val date: Long = 0L,
    val location: String = "",  // lat: Double, long: Double may crash in the future
    val ticketTypes: Map<String, Map<String, Any>> = emptyMap(),  // vip: {price: Double, quantity: Int, available: Int}
    val videoUrl: String = "",
    val isOutdoor: Boolean = false,
    val organizerId: String = "",
    val hotScore: Double = 0.0,
    val cancelledAt: Long = 0L,
    val createdAt: Long = 0L,
    val lastUpdatedAt: Long = 0L,
    val recurringRule: Map<String, Any> = emptyMap(),
    val requiredAge: Long = 0L,
    val sponsors: List<String> = emptyList(),
    val status: String = "",
    val tags: List<String> = emptyList(),
    val venueId: String = "",
    val viewCount: Long = 0L,
    val visibility: String = "",
    val endDate: Long = 0L,
    val geohash: String = "",
    val imageUrl: String = "",
    val bannerUrl: String = "",
    val city: String = "",
    val venueName: String = "",
    val minPrice: Double = 0.0,
)