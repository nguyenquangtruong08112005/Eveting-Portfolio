package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

data class UserTicketResponse(
    @SerializedName("tickets")
    val tickets: List<UserTicketDto>,
    @SerializedName("pagination")
    val pagination: PaginationDto
)

data class UserTicketDto(
    @SerializedName("id") val id: String,
    @SerializedName("status") val status: String, // paid, pending, checkedIn, cancelled
    @SerializedName("type") val type: String,
    @SerializedName("price") val price: Double,
    @SerializedName("seat") val seat: String?,
    @SerializedName("qrCode") val qrCode: String?,
    @SerializedName("purchaseDate") val purchaseDate: Long,
    @SerializedName("event") val event: TicketEventSummaryDto
)

data class TicketEventSummaryDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("date") val date: Long,
    @SerializedName("imageUrl") val imageUrl: String?,
    @SerializedName("venueName") val venueName: String?,
    @SerializedName("city") val city: String?,
    @SerializedName("status") val status: String?
)