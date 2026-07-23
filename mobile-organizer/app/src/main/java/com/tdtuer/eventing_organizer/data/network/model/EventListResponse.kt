package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

class EventListResponse(
    @SerializedName("events")
    val events: List<EventDto>,

    @SerializedName("pagination")
    val pagination: PaginationDto
)