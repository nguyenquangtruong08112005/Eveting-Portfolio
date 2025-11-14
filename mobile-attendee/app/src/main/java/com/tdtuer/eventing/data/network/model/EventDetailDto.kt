package com.tdtuer.eventing.data.network.model

import com.google.gson.annotations.SerializedName

// DTO này dùng để "hứng" CẤU TRÚC ĐẦY ĐỦ của một sự kiện
data class EventDetailDto(
    @SerializedName("id")
    val id: String?,

    @SerializedName("name")
    val name: String?,

    @SerializedName("description")
    val description: String?,

    @SerializedName("imageUrl")
    val imageUrl: String?,

    @SerializedName("bannerUrl")
    val bannerUrl: String?,

    @SerializedName("featuredProfiles")
    val featuredProfiles: List<featuredProfilesDto>?, // Sửa thành List<String>

    @SerializedName("category")
    val category: List<String>?,

    @SerializedName("tags")
    val tags: List<String>?,

    @SerializedName("date")
    val date: Long?,

    @SerializedName("endDate")
    val endDate: Long?,

    @SerializedName("eventType")
    val eventType: String?,

    @SerializedName("onlineUrl")
    val onlineUrl: String?,

    @SerializedName("location")
    val location: LocationDto?,

    @SerializedName("geohash")
    val geohash: String?,

    @SerializedName("city")
    val city: String?,

    @SerializedName("venueName")
    val venueName: String?,

    @SerializedName("videoUrl")
    val videoUrl: String?,

    @SerializedName("isOutdoor")
    val isOutdoor: Boolean?,

    @SerializedName("visibility")
    val visibility: String?,

    @SerializedName("requireAge")
    val requireAge: Int?,

    @SerializedName("status")
    val status: String?,

    @SerializedName("sponsors")
    val sponsors: List<SponsorDto>?,

    @SerializedName("minPrice")
    val minPrice: Double?,

    @SerializedName("ticketTypes")
    val ticketTypes: Map<String, PublicTicketTypeDto>?,

    @SerializedName("venue")
    val venue: VenueDto? // Sửa thành VenueDto
)

data class PublicTicketTypeDto(
    @SerializedName("price")
    val price: Long?,
)

data class featuredProfilesDto(
    @SerializedName("id")
    val id: String?,

    @SerializedName("name")
    val name: String?,

    @SerializedName("profileType")
    val profileType: String?,

    @SerializedName("bio")
    val bio: String?,

    @SerializedName("imageUrl")
    val imageUrl: String?,

    @SerializedName("genres")
    val genres: List<String>?,

    @SerializedName("followerCount")
    val followerCount: Int?,
)