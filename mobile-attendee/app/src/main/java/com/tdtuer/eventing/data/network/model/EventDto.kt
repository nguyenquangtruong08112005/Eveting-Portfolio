package com.tdtuer.eventing.data.network.model

import com.google.gson.annotations.SerializedName

// Lớp này phải khớp 1:1 với JSON của một Event
data class EventDto(
    @SerializedName("id")
    val id: String?,

    @SerializedName("name")
    val name: String?,

    @SerializedName("date")
    val date: Long?,

    @SerializedName("imageUrl")
    val imageUrl: String?,

    @SerializedName("bannerUrl")
    val bannerUrl: String?,

    @SerializedName("videoUrl")
    val videoUrl: String?,

    @SerializedName("location")
    val location: LocationDto?,

    @SerializedName("city")
    val city: String?,

    @SerializedName("venueName")
    val venueName: String?,

    @SerializedName("eventType")
    val eventType: String?,

    @SerializedName("minPrice")
    val minPrice: Double?,

    @SerializedName("category")
    val category: List<String>?,
)

// Các DTO lồng bên trong
data class LocationDto(
    @SerializedName("latitude")
    val latitude: Double?,

    @SerializedName("longitude")
    val longitude: Double?
)

data class SponsorDto(
    @SerializedName("name")
    val name: String?,

    @SerializedName("logoUrl")
    val logoUrl: String?,

    @SerializedName("level")
    val level: String?
)

data class TicketTypeDto(
    @SerializedName("price")
    val price: Long?, // Dùng Long cho an toàn với giá trị lớn

    @SerializedName("quantity")
    val quantity: Int?,

    @SerializedName("available")
    val available: Int?
)
