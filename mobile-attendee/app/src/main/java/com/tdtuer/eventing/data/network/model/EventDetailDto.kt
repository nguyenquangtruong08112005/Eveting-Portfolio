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

    @SerializedName("videoUrl")
    val videoUrl: String?,

    @SerializedName("date")
    val date: Long?,

    @SerializedName("endDate")
    val endDate: Long?,

    @SerializedName("location")
    val location: LocationDto?, // (Bạn đã tạo LocationDto)

    @SerializedName("city")
    val city: String?,

    @SerializedName("venueName")
    val venueName: String?,

    @SerializedName("venueId")
    val venueId: String?,

    @SerializedName("eventType")
    val eventType: String?,

    @SerializedName("onlineUrl")
    val onlineUrl: String?,

    @SerializedName("minPrice")
    val minPrice: Double?,

    @SerializedName("ticketTypes")
    val ticketTypes: Map<String, Any>?, // Dùng Any cho an toàn

    @SerializedName("organizerId")
    val organizerId: String?,

    @SerializedName("status")
    val status: String?,

    @SerializedName("visibility")
    val visibility: String?,

    @SerializedName("category")
    val category: List<String>?,

    @SerializedName("tags")
    val tags: List<String>?,

    @SerializedName("sponsors")
    val sponsors: List<Any>? // Dùng Any cho an toàn

// ... thêm các trường khác nếu cần
)