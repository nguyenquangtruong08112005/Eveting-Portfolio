package com.tdtuer.eventing.domain.model

data class DetailedTicket(
    // Thông tin vé
    val id: String,
    val ticketType: String, // "Entrance"
    val price: Double,
    val qrCode: String,
    val purchaseDate: Long,
    val status: String,

    // Thông tin sự kiện
    val eventName: String,
    val eventDate: Long,
    val eventBannerUrl: String,

    // Thông tin địa điểm
    val venueName: String,
    val fullAddress: String // Ghép từ street, ward, district, city
)