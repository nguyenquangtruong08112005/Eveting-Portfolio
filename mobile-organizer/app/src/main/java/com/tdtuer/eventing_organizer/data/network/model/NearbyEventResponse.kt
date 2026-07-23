package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

/**
 * DTO cho response của API getNearbyEvents.
 */
data class NearbyEventResponse(
    @SerializedName("events")
    val events: List<NearbyEventDto>?,

    @SerializedName("pagination")
    val pagination: NearbyPaginationDto?
)

/**
 * DTO cho một event item trong danh sách nearby.
 * Chứa các trường dữ liệu rút gọn so với EventDetailDto.
 */
data class NearbyEventDto(
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
    val location: LocationDto?, // Tái sử dụng LocationDto

    @SerializedName("city")
    val city: String?,

    @SerializedName("venueName")
    val venueName: String?,

    @SerializedName("eventType")
    val eventType: String?,

    @SerializedName("minPrice")
    val minPrice: Double?, // Dùng Double cho an toàn

    @SerializedName("distanceKm")
    val distanceKm: Double?
)

/**
 * DTO cho thông tin phân trang của API getNearbyEvents.
 */
data class NearbyPaginationDto(
    @SerializedName("currentPage")
    val currentPage: Int?,

    @SerializedName("limit")
    val limit: Int?,

    @SerializedName("totalPages")
    val totalPages: Int?,

    @SerializedName("totalItems")
    val totalItems: Int?,

    @SerializedName("actualRadiusKm")
    val actualRadiusKm: Double? // Dùng Double cho an toàn
)
