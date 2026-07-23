package com.tdtuer.eventing_organizer.data.mapper

import com.tdtuer.eventing_organizer.data.network.model.*
import com.tdtuer.eventing_organizer.domain.model.Event
import com.tdtuer.eventing_organizer.domain.model.Weather

// --- HÀM MAP CHÍNH ---
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
    // Logic xử lý Featured Profiles: Ưu tiên lấy IDs nếu server trả về IDs
    // Nếu server trả về object thì map sang object, hiện tại server trả về List String ID
    val profileIds = this.featuredProfileIds ?: this.featuredProfiles?.map { it.id } ?: emptyList()

    return Event(
        id = this.id ?: "",
        name = this.name ?: "",
        description = this.description ?: "",
        imageUrl = this.imageUrl ?: "",
        bannerUrl = this.bannerUrl ?: "",

        // Lưu List String ID vào đây thay vì List Object (vì Domain đang để List<Any>)
        // Tốt nhất nên refactor Domain thành List<String> cho featuredProfileIds riêng
        featuredProfiles = profileIds,

        category = this.category ?: emptyList(),
        tags = this.tags ?: emptyList(),
        date = this.date ?: 0L,
        endDate = this.endDate ?: 0L,
        eventType = this.eventType ?: "physical",
        onlineUrl = this.onlineUrl ?: "",
        location = this.location?.toLocationString() ?: "",
        geohash = this.geohash ?: "",
        city = this.city ?: "Thành phố Hồ Chí Minh",
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

// Hàm helper mới để convert Ticket DTO sang Map Properties (cho khớp Domain cũ)
private fun TicketTypeDetailsDto.toMap(): Map<String, Any> {
    val map = mutableMapOf<String, Any>()
    map["name"] = this.name ?: ""
    map["price"] = this.price ?: 0.0
    map["quantity"] = this.quantity ?: 0
    map["description"] = this.description ?: ""
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
    return Weather(
        temperature = this.temperature.toInt(),
        condition = this.condition,
        description = this.description.replaceFirstChar { it.uppercase() },
        iconUrl = this.iconUrl.replace("http://", "https://")
    )
}