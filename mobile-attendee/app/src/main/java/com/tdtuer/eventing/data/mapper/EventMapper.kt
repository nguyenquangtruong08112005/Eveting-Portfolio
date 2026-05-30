package com.tdtuer.eventing.data.mapper

import com.tdtuer.eventing.data.network.model.EventDetailDto
import com.tdtuer.eventing.data.network.model.EventDto
import com.tdtuer.eventing.data.network.model.LocationDto
import com.tdtuer.eventing.data.network.model.PublicTicketTypeDto
import com.tdtuer.eventing.data.network.model.SponsorDto
import com.tdtuer.eventing.data.network.model.TicketTypeDto
import com.tdtuer.eventing.data.network.model.VenueDto
import com.tdtuer.eventing.data.network.model.WeatherDto
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Weather

// --- HÀM MAP CHÍNH ---
// Đây là hàm "biên dịch" DTO thô thành Domain Model "sạch"
fun EventDto.toDomainModel(): Event {
    return Event(
        id = this.id ?: "",
        name = this.name ?: "",
        date = this.date ?: 0L,
        location = "${this.venueName}, ${this.city}",
        coordinates = this.location?.toLocationString() ?: "",
        category = this.category ?: emptyList(),
        videoUrl = this.videoUrl ?: "",
        imageUrl = this.imageUrl ?: "",
        bannerUrl = this.bannerUrl ?: "",
        city = this.city ?: "Viet Nam",
        venueName = this.venueName ?: "",
        minPrice = this.minPrice ?: 0.0,
    )
}

fun EventDetailDto.toDomainModel(): Event {
    return Event(
        id = this.id ?: "",
        name = this.name ?: "",
        description = this.description ?: "",
        imageUrl = this.imageUrl ?: "",
        bannerUrl = this.bannerUrl ?: "",
        featuredProfiles = this.featuredProfiles ?: emptyList(),
        category = this.category ?: emptyList(),
        tags = this.tags ?: emptyList(),
        date = this.date ?: 0L,
        endDate = this.endDate ?: 0L,
        eventType = this.eventType ?: "physical",
        onlineUrl = this.onlineUrl ?: "",
        location = this.location?.toLocationString() ?: "",
        geohash = this.geohash ?: "",
        city = this.city ?: "Viet Nam",
        venueName = this.venueName ?: "",
        videoUrl = this.videoUrl ?: "",
        isOutdoor = this.isOutdoor ?: false,
        status = this.status ?: "active",
        visibility = this.visibility ?: "public",
        requiredAge = (this.requireAge ?: 0).toLong(),
        sponsors = this.sponsors?.map { it.toSponsorString() } ?: emptyList(),
        minPrice = this.minPrice ?: 0.0,
        ticketTypes = this.ticketTypes?.mapValues { it.value.toMap() } ?: emptyMap(),
        venueDetails = this.venue?.toVenueDetailsMap() ?: emptyMap()
    )
}


// --- CÁC HÀM HELPER ---

private fun LocationDto.toLocationString(): String {
    return "Lat: ${this.latitude ?: 0.0}, Lon: ${this.longitude ?: 0.0}"
}

private fun SponsorDto.toSponsorString(): String {
    return this.name ?: "Unknown Sponsor"
}

private fun TicketTypeDto.toMap(): Map<String, Any> {
    val map = mutableMapOf<String, Any>()
    this.price?.let { map["price"] = it }
    this.quantity?.let { map["quantity"] = it }
    this.available?.let { map["available"] = it }
    return map
}

private fun PublicTicketTypeDto.toMap(): Map<String, Any> {
    val map = mutableMapOf<String, Any>()
    this.price?.let { map["price"] = it }
    return map
}

private fun VenueDto.toVenueDetailsMap(): Map<String, Any> {
    val map = mutableMapOf<String, Any>()
    this.id?.let { map["id"] = it }
    this.name?.let { map["name"] = it }
    this.addressDetails?.let {
        map["address"] = "${it.street}, ${it.ward}, ${it.district}, ${it.city}"
    }
    this.location?.let {
        map["latitude"] = it.latitude ?: 0.0
        map["longitude"] = it.longitude ?: 0.0
    }
    this.nearby?.let { map["nearby"] = it }
    return map
}

fun WeatherDto.toDomainModel(): Weather {
    // API có thể trả về null, dùng ?: "" để tránh crash khi gọi .replace
    val safeDescription = this.description
    val safeIconUrl = this.iconUrl

    return Weather(
        temperature = this.temperature.toInt(),
        condition = this.condition,
        description = safeDescription.replaceFirstChar { it.uppercase() },
        iconUrl = safeIconUrl.replace("http://", "https://"),
    )
}
