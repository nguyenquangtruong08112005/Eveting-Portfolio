package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.JsonAdapter
import com.google.gson.annotations.SerializedName
import com.tdtuer.eventing_organizer.data.network.deserializer.TicketTypesDeserializer

// DTO này dùng để "hứng" CẤU TRÚC ĐẦY ĐỦ của một sự kiện
data class EventDetailDto(
    @SerializedName("id") val id: String?,
    @SerializedName("name") val name: String?,
    @SerializedName("description") val description: String?,
    @SerializedName("imageUrl") val imageUrl: String?,
    @SerializedName("bannerUrl") val bannerUrl: String?,

    // --- SỬA ĐỔI: Server trả về ID list, không phải Object list ---
    @SerializedName("featuredProfileIds") val featuredProfileIds: List<String>?,
    // Giữ lại field này phòng trường hợp server update populate data sau này
    @SerializedName("featuredProfiles") val featuredProfiles: List<FeaturedProfileDto>?,

    @SerializedName("category") val category: List<String>?,
    @SerializedName("tags") val tags: List<String>?,

    @SerializedName("date") val date: Long?,
    @SerializedName("endDate") val endDate: Long?,

    @SerializedName("eventType") val eventType: String?,
    @SerializedName("onlineUrl") val onlineUrl: String?,

    @SerializedName("location") val location: LocationDto?,
    @SerializedName("geohash") val geohash: String?,
    @SerializedName("city") val city: String?,
    @SerializedName("venueName") val venueName: String?,

    @SerializedName("videoUrl") val videoUrl: String?,
    @SerializedName("isOutdoor") val isOutdoor: Boolean?,
    @SerializedName("visibility") val visibility: String?,
    @SerializedName("requireAge") val requireAge: Int?,
    @SerializedName("status")
    val status: String?,
    @SerializedName("minPrice") val minPrice: Double?,

    @SerializedName("sponsors") val sponsors: List<SponsorDto>?,

    @JsonAdapter(TicketTypesDeserializer::class)
    @SerializedName("ticketTypes")
    val ticketTypes: Map<String, TicketTypeDetailsDto>?,

    @SerializedName("venue") val venue: VenueDto?
)

// DTO cho Ticket Type trong chi tiết sự kiện
data class TicketTypeDetailsDto(
    @SerializedName("name") val name: String?,
    @SerializedName("price") val price: Double?, // Use Double or Long
    @SerializedName("quantity") val quantity: Int?,
    @SerializedName("available") val available: Int?,
    @SerializedName("description") val description: String?
)
