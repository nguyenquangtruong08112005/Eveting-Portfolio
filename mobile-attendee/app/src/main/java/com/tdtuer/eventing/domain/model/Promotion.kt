package com.tdtuer.eventing.domain.model

data class Promotion(
    val id: String = "",
    val eventId: String? = null,  // Optional
    val code: String = "",
    val discount: Double = 0.0,
    val type: String = "",
    val validUntil: Long = 0L,
    val usageLimit: Int = 0
)