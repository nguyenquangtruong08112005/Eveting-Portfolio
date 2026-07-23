package com.tdtuer.eventing_organizer.domain.model

data class Event(
    val bannerUrl: String = "",
    val cancelledAt: Long = 0L,
    val category: List<String> = emptyList(),
    val city: String = "",
    val createdAt: Long = 0L,
    val coordinates: String = "",
    val date: Long = 0L,
    val description: String = "",
    val endDate: Long? = null,
    val eventType: String = "physical",
    val featuredProfiles: List<Any> = emptyList(),
    val geohash: String = "",
    val hotScore: Double = 0.0,
    val id: String = "",
    val imageUrl: String = "",
    val isOutdoor: Boolean = false,
    val lastUpdatedAt: Long = 0L,
    val location: String = "",  // lat: Double, long: Double may crash in the future
    val minPrice: Double? = null,
    val name: String = "",
    val onlineUrl: String = "",
    val recurringRule: Map<String, Any> = emptyMap(),
    val requiredAge: Long = 0L,
    val sponsors: List<String> = emptyList(),
    val status: String = "",
    val tags: List<String> = emptyList(),
    val ticketTypes: Map<String, Map<String, Any>> = emptyMap(),  // vip: {price: Double, quantity: Int, available: Int}
    val venueDetails: Map<String, Any> = emptyMap(),
    val venueName: String = "",
    val videoUrl: String = "",
    val viewCount: Long = 0L,
    val visibility: String = ""
)
