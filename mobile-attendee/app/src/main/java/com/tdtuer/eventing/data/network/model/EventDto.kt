package com.tdtuer.eventing.data.network.model

import com.google.gson.annotations.SerializedName

// Lớp này phải khớp 1:1 với JSON của một Event
data class EventDto(
    @SerializedName("id")
    val id: String?,

    @SerializedName("name")
    val name: String?,

    @SerializedName("description")
    val description: String?,

    @SerializedName("featuredProfileIds")
    val featuredProfileIds: List<String>?,

    @SerializedName("category")
    val category: List<String>?,

    @SerializedName("tags")
    val tags: List<String>?,

    @SerializedName("date")
    val date: Long?,

    @SerializedName("location")
    val location: LocationDto?,

    @SerializedName("geohash")
    val geohash: String?,

    @SerializedName("venueId")
    val venueId: String?,

    @SerializedName("ticketTypes")
    val ticketTypes: Map<String, TicketTypeDto>?,

    @SerializedName("videoUrl")
    val videoUrl: String?,

    @SerializedName("imageUrl")
    val imageUrl: String?,

    @SerializedName("bannerUrl")
    val bannerUrl: String?,

    @SerializedName("isOutdoor")
    val isOutdoor: Boolean?,

    @SerializedName("organizerId")
    val organizerId: String?,

    @SerializedName("status")
    val status: String?,

    @SerializedName("visibility")
    val visibility: String?,

    @SerializedName("recurringRule")
    val recurringRule: Any?, // Dùng Any? vì giá trị là null, có thể thay đổi sau

    @SerializedName("hotScore")
    val hotScore: Int?,

    @SerializedName("viewCount")
    val viewCount: Int?,

    @SerializedName("requiredAge")
    val requiredAge: Int?,

    @SerializedName("sponsors")
    val sponsors: List<SponsorDto>?,

    @SerializedName("createdAt")
    val createdAt: Long?,

    @SerializedName("lastUpdatedAt")
    val lastUpdatedAt: Long?
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
