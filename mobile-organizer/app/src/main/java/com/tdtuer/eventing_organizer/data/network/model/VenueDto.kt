package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

/**
 * DTO cho đối tượng Venue đầy đủ, nhận từ server.
 */
data class VenueDto(
    @SerializedName("id")
    val id: String?,

    @SerializedName("name")
    val name: String?,

    @SerializedName("addressDetails")
    val addressDetails: AddressDetailsDto?,

    @SerializedName("location")
    val location: LocationDto?, // Tái sử dụng LocationDto đã có

    @SerializedName("nearby")
    val nearby: List<String>?,

    @SerializedName("seatMapTemplate")
    val seatMapTemplate: SeatMapTemplateDto?
)

/**
 * DTO cho chi tiết địa chỉ, lồng bên trong VenueDto.
 */
data class AddressDetailsDto(
    @SerializedName("street")
    val street: String?,

    @SerializedName("ward")
    val ward: String?,

    @SerializedName("district")
    val district: String?,

    @SerializedName("city")
    val city: String?
)

/**
 * DTO cho mẫu sơ đồ chỗ ngồi.
 */
data class SeatMapTemplateDto(
    @SerializedName("totalSeats")
    val totalSeats: Int?,

    @SerializedName("layout")
    val layout: List<SeatLayoutItemDto>?
)

/**
 * DTO cho một mục (chỗ ngồi) trong layout.
 */
data class SeatLayoutItemDto(
    @SerializedName("seatId")
    val seatId: String?,

    @SerializedName("type")
    val type: String?,

    @SerializedName("row")
    val row: String?
)
