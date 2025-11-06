package com.tdtuer.eventing.data.mapper

import com.tdtuer.eventing.data.network.model.EventDto
import com.tdtuer.eventing.data.network.model.LocationDto
import com.tdtuer.eventing.data.network.model.SponsorDto
import com.tdtuer.eventing.data.network.model.TicketTypeDto
import com.tdtuer.eventing.domain.model.Event

// --- HÀM MAP CHÍNH ---
// Đây là hàm "biên dịch" DTO thô thành Domain Model "sạch"
fun EventDto.toDomainModel(): Event {
    return Event(
        id = this.id ?: "",
        name = this.name ?: "",
        date = this.date ?: 0L,
        location = "${this.venueName}, ${this.city}",
        videoUrl = this.videoUrl ?: "",
        imageUrl = this.imageUrl ?: "",
        bannerUrl = this.bannerUrl ?: "",
        city = this.city ?: "Viet Nam",
        venueName = this.venueName ?: "",
        minPrice = this.minPrice ?: 0.0,
    )
}

// --- CÁC HÀM HELPER ---

// Biến đối tượng LocationDto thành 1 chuỗi String
private fun LocationDto.toLocationString(): String {
    return "Lat: ${this.latitude ?: 0.0}, Lon: ${this.longitude ?: 0.0}"
}

// Biến đối tượng SponsorDto thành 1 chuỗi String
private fun SponsorDto.toSponsorString(): String {
    // Giả sử bạn muốn lấy tên của nhà tài trợ
    return this.name ?: "Unknown Sponsor"
}

// Biến đối tượng TicketTypeDto thành một Map<String, Any>
private fun TicketTypeDto.toMap(): Map<String, Any> {
    val map = mutableMapOf<String, Any>()
    this.price?.let { map["price"] = it }
    this.quantity?.let { map["quantity"] = it }
    this.available?.let { map["available"] = it }
    return map
}
