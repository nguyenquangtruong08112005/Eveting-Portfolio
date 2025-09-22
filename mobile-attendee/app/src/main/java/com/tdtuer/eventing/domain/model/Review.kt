package com.tdtuer.eventing.domain.model

data class Review(
    val id: String = "",
    val eventId: String = "",
    val userId: String = "",
    val rating: Int = 0,
    val comment: String = "",
    val date: Long = 0L
)