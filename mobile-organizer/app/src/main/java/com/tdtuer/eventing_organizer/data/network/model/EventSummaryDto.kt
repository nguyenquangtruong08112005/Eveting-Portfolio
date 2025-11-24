package com.tdtuer.eventing_organizer.data.network.model

data class EventSummaryDto(
    val name: String,
    val date: Long,
    val bannerUrl: String,
    val venueName: String
)