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
        description = this.description ?: "",
        featuredProfileIds = this.featuredProfileIds ?: emptyList(),
        category = this.category ?: emptyList(),
        tags = this.tags ?: emptyList(),
        date = this.date ?: 0L,
        location = this.location?.toLocationString() ?: "",
        geohash = this.geohash ?: "",
        venueId = this.venueId ?: "",
        ticketTypes = this.ticketTypes?.mapValues { it.value.toMap() } ?: emptyMap(),
        videoUrl = this.videoUrl ?: "",
        imageUrl = this.imageUrl ?: "",
        bannerUrl = this.bannerUrl ?: "",
        isOutdoor = this.isOutdoor ?: false,
        organizerId = this.organizerId ?: "",
        status = this.status ?: "unknown",
        visibility = this.visibility ?: "public",
        hotScore = this.hotScore?.toDouble() ?: 0.0,
        viewCount = this.viewCount?.toLong() ?: 0L,
        requiredAge = this.requiredAge?.toLong() ?: 0L,
        sponsors = this.sponsors?.map { it.toSponsorString() } ?: emptyList(),
        createdAt = this.createdAt ?: 0L,
        lastUpdatedAt = this.lastUpdatedAt ?: 0L,
        // recurringRule và các trường khác có thể được thêm vào sau nếu cần
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
