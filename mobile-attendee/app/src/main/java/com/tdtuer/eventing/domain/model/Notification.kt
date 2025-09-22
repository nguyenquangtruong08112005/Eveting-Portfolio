package com.tdtuer.eventing.domain.model

data class Notification(
    val id: String = "",
    val userId: String = "",  // Or "all"
    val type: String = "",
    val message: String = "",
    val eventId: String? = null,
    val sentDate: Long = 0L
)