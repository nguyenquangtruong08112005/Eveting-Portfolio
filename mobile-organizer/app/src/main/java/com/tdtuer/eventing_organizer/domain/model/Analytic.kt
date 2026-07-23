package com.tdtuer.eventing_organizer.domain.model

data class Analytic(
    val eventId: String = "",
    val totalRevenue: Double = 0.0,
    val ticketsSold: Map<String, Int> = emptyMap(),  // Per type
    val views: Int = 0,
    val popularTypes: List<String> = emptyList()
)