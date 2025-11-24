package com.tdtuer.eventing_organizer.domain.model

data class Artist(
    val id: String = "",
    val name: String = "",
    val bio: String = "",
    val imageUrl: String = "",
    val upcomingEventIds: List<String> = emptyList()
)