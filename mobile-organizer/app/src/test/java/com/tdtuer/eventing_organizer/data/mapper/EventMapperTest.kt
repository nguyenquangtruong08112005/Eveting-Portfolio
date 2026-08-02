package com.tdtuer.eventing_organizer.data.mapper

import com.tdtuer.eventing_organizer.data.network.model.*
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EventMapperTest {

    @Test
    fun `EventDto with all fields populated maps correctly`() {
        val dto = EventDto(
            id = "evt-001",
            name = "Tech Conference",
            date = 1700000000000L,
            imageUrl = "https://example.com/image.jpg",
            bannerUrl = "https://example.com/banner.jpg",
            videoUrl = "https://example.com/video.mp4",
            location = LocationDto(latitude = 10.78, longitude = 106.70),
            city = "Ho Chi Minh",
            venueName = "Landmark 81",
            eventType = "physical",
            minPrice = 250000.0,
            category = listOf("tech", "conference")
        )

        val event = dto.toDomainModel()

        assertEquals("evt-001", event.id)
        assertEquals("Tech Conference", event.name)
        assertEquals(1700000000000L, event.date)
        assertEquals("https://example.com/image.jpg", event.imageUrl)
        assertEquals("https://example.com/banner.jpg", event.bannerUrl)
        assertEquals("https://example.com/video.mp4", event.videoUrl)
        assertEquals("Lat: 10.78, Lon: 106.7", event.coordinates)
        assertEquals("Ho Chi Minh", event.city)
        assertEquals("Landmark 81", event.venueName)
        assertEquals(250000.0, event.minPrice!!, 0.001)
        assertEquals(listOf("tech", "conference"), event.category)
        assertEquals("Landmark 81, Ho Chi Minh", event.location)
    }

    @Test
    fun `EventDto with all nulls uses defaults`() {
        val dto = EventDto(
            id = null, name = null, date = null, imageUrl = null, bannerUrl = null,
            videoUrl = null, location = null, city = null, venueName = null,
            eventType = null, minPrice = null, category = null
        )

        val event = dto.toDomainModel()

        assertEquals("", event.id)
        assertEquals("", event.name)
        assertEquals(0L, event.date)
        assertEquals("", event.imageUrl)
        assertEquals("", event.bannerUrl)
        assertEquals("", event.videoUrl)
        assertEquals("", event.coordinates)
        assertEquals("Viet Nam", event.city)
        assertEquals("", event.venueName)
        assertEquals(0.0, event.minPrice!!, 0.001)
        assertEquals(emptyList<String>(), event.category)
        assertEquals("null, null", event.location)
    }

    @Test
    fun `EventDto with null location yields empty coordinates`() {
        val dto = EventDto(
            id = null, name = null, date = null, imageUrl = null, bannerUrl = null,
            videoUrl = null, location = null, city = "Hanoi", venueName = "My Venue",
            eventType = null, minPrice = null, category = null
        )

        val event = dto.toDomainModel()

        assertEquals("", event.coordinates)
        assertEquals("My Venue, Hanoi", event.location)
    }

    @Test
    fun `EventDetailDto with all fields populated maps correctly`() {
        val dto = EventDetailDto(
            id = "det-001",
            name = "Music Festival",
            description = "Annual music festival",
            imageUrl = "https://example.com/img.jpg",
            bannerUrl = "https://example.com/ban.jpg",
            featuredProfileIds = listOf("p1", "p2"),
            featuredProfiles = null,
            category = listOf("music"),
            tags = listOf("rock", "live"),
            date = 1700100000000L,
            endDate = 1700186400000L,
            eventType = "outdoor",
            onlineUrl = "https://stream.example.com",
            location = LocationDto(21.03, 105.85),
            geohash = "w7e4p",
            city = "Hanoi",
            venueName = "My Dinh Stadium",
            videoUrl = "https://example.com/vid.mp4",
            isOutdoor = true,
            visibility = "public",
            requireAge = 18,
            status = "active",
            minPrice = 500000.0,
            sponsors = listOf(SponsorDto("Coca Cola", "https://coke.com/logo.png", "gold")),
            ticketTypes = mapOf(
                "vip" to TicketTypeDetailsDto("VIP", 1000000.0, 50, 20, "VIP access"),
                "regular" to TicketTypeDetailsDto("Regular", 500000.0, 200, 150, "General admission")
            ),
            venue = VenueDto(
                id = "vn-001",
                name = "My Dinh National Stadium",
                addressDetails = AddressDetailsDto("Le Duc Tho", "My Dinh 1", "Nam Tu Liem", "Hanoi"),
                location = LocationDto(21.03, 105.85),
                nearby = listOf("Bus Stop", "Parking Lot"),
                seatMapTemplate = null
            )
        )

        val event = dto.toDomainModel()

        assertEquals("det-001", event.id)
        assertEquals("Music Festival", event.name)
        assertEquals("Annual music festival", event.description)
        assertEquals("https://example.com/img.jpg", event.imageUrl)
        assertEquals("https://example.com/ban.jpg", event.bannerUrl)
        assertEquals(listOf("p1", "p2"), event.featuredProfiles)
        assertEquals(listOf("music"), event.category)
        assertEquals(listOf("rock", "live"), event.tags)
        assertEquals(1700100000000L, event.date)
        assertEquals(1700186400000L, event.endDate)
        assertEquals("outdoor", event.eventType)
        assertEquals("https://stream.example.com", event.onlineUrl)
        assertEquals("Lat: 21.03, Lon: 105.85", event.location)
        assertEquals("w7e4p", event.geohash)
        assertEquals("Hanoi", event.city)
        assertEquals("My Dinh Stadium", event.venueName)
        assertEquals("https://example.com/vid.mp4", event.videoUrl)
        assertEquals(true, event.isOutdoor)
        assertEquals("active", event.status)
        assertEquals("public", event.visibility)
        assertEquals(18L, event.requiredAge)
        assertEquals(500000.0, event.minPrice!!, 0.001)
        assertEquals(listOf("Coca Cola"), event.sponsors)

        val vipTicket = event.ticketTypes["vip"]
        assertEquals("VIP", vipTicket?.get("name"))
        assertEquals(1000000.0, vipTicket?.get("price") as Double, 0.001)
        assertEquals(50, vipTicket?.get("quantity"))
        assertEquals("VIP access", vipTicket?.get("description"))

        assertEquals("vn-001", event.venueDetails["id"])
        assertEquals("My Dinh National Stadium", event.venueDetails["name"])
        assertEquals("Le Duc Tho, My Dinh 1, Nam Tu Liem, Hanoi", event.venueDetails["address"])
        assertEquals(21.03, event.venueDetails["latitude"] as Double, 0.001)
        assertEquals(105.85, event.venueDetails["longitude"] as Double, 0.001)
        assertEquals(listOf("Bus Stop", "Parking Lot"), event.venueDetails["nearby"])
    }

    @Test
    fun `EventDetailDto with all nulls uses defaults`() {
        val dto = EventDetailDto(
            id = null, name = null, description = null, imageUrl = null, bannerUrl = null,
            featuredProfileIds = null, featuredProfiles = null,
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null, location = null, geohash = null,
            city = null, venueName = null, videoUrl = null, isOutdoor = null,
            visibility = null, requireAge = null, status = null, minPrice = null,
            sponsors = null, ticketTypes = null, venue = null
        )

        val event = dto.toDomainModel()

        assertEquals("", event.id)
        assertEquals("", event.name)
        assertEquals("", event.description)
        assertEquals("", event.imageUrl)
        assertEquals("", event.bannerUrl)
        assertEquals(emptyList<Any>(), event.featuredProfiles)
        assertEquals(emptyList<String>(), event.category)
        assertEquals(emptyList<String>(), event.tags)
        assertEquals(0L, event.date)
        assertEquals(0L, event.endDate)
        assertEquals("physical", event.eventType)
        assertEquals("", event.onlineUrl)
        assertEquals("", event.location)
        assertEquals("", event.geohash)
        assertEquals("Thành phố Hồ Chí Minh", event.city)
        assertEquals("", event.venueName)
        assertEquals("", event.videoUrl)
        assertEquals(false, event.isOutdoor)
        assertEquals("active", event.status)
        assertEquals("public", event.visibility)
        assertEquals(0L, event.requiredAge)
        assertEquals(0.0, event.minPrice!!, 0.001)
        assertEquals(emptyList<String>(), event.sponsors)
        assertEquals(emptyMap<String, Map<String, Any>>(), event.ticketTypes)
        assertEquals(emptyMap<String, Any>(), event.venueDetails)
    }

    @Test
    fun `EventDetailDto uses featuredProfileIds when available`() {
        val dto = EventDetailDto(
            id = null, name = null, description = null, imageUrl = null, bannerUrl = null,
            featuredProfileIds = listOf("fp1", "fp2", "fp3"),
            featuredProfiles = listOf(FeaturedProfileDto("ignored", "Ignored", null, null, null, null)),
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null, location = null, geohash = null,
            city = null, venueName = null, videoUrl = null, isOutdoor = null,
            visibility = null, requireAge = null, status = null, minPrice = null,
            sponsors = null, ticketTypes = null, venue = null
        )

        val event = dto.toDomainModel()

        assertEquals(listOf("fp1", "fp2", "fp3"), event.featuredProfiles)
    }

    @Test
    fun `EventDetailDto falls back to featuredProfiles objects when profileIds is null`() {
        val dto = EventDetailDto(
            id = null, name = null, description = null, imageUrl = null, bannerUrl = null,
            featuredProfileIds = null,
            featuredProfiles = listOf(
                FeaturedProfileDto("fp1", "Alice", null, null, null, null),
                FeaturedProfileDto("fp2", "Bob", null, null, null, null)
            ),
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null, location = null, geohash = null,
            city = null, venueName = null, videoUrl = null, isOutdoor = null,
            visibility = null, requireAge = null, status = null, minPrice = null,
            sponsors = null, ticketTypes = null, venue = null
        )

        val event = dto.toDomainModel()

        assertEquals(listOf("fp1", "fp2"), event.featuredProfiles)
    }

    @Test
    fun `EventDetailDto with null sponsor name yields Unknown Sponsor`() {
        val dto = EventDetailDto(
            id = null, name = null, description = null, imageUrl = null, bannerUrl = null,
            featuredProfileIds = null, featuredProfiles = null,
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null, location = null, geohash = null,
            city = null, venueName = null, videoUrl = null, isOutdoor = null,
            visibility = null, requireAge = null, status = null, minPrice = null,
            sponsors = listOf(SponsorDto(null, null, null)),
            ticketTypes = null, venue = null
        )

        val event = dto.toDomainModel()

        assertEquals(listOf("Unknown Sponsor"), event.sponsors)
    }

    @Test
    fun `EventDetailDto with empty sponsors yields empty list`() {
        val dto = EventDetailDto(
            id = null, name = null, description = null, imageUrl = null, bannerUrl = null,
            featuredProfileIds = null, featuredProfiles = null,
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null, location = null, geohash = null,
            city = null, venueName = null, videoUrl = null, isOutdoor = null,
            visibility = null, requireAge = null, status = null, minPrice = null,
            sponsors = emptyList(), ticketTypes = null, venue = null
        )

        val event = dto.toDomainModel()

        assertEquals(emptyList<String>(), event.sponsors)
    }

    @Test
    fun `EventDetailDto with null ticketTypes defaults to empty map`() {
        val dto = EventDetailDto(
            id = null, name = null, description = null, imageUrl = null, bannerUrl = null,
            featuredProfileIds = null, featuredProfiles = null,
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null, location = null, geohash = null,
            city = null, venueName = null, videoUrl = null, isOutdoor = null,
            visibility = null, requireAge = null, status = null, minPrice = null,
            sponsors = null, ticketTypes = null, venue = null
        )

        val event = dto.toDomainModel()

        assertTrue(event.ticketTypes.isEmpty())
    }

    @Test
    fun `EventDetailDto with null venue yields empty venueDetails`() {
        val dto = EventDetailDto(
            id = null, name = null, description = null, imageUrl = null, bannerUrl = null,
            featuredProfileIds = null, featuredProfiles = null,
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null, location = null, geohash = null,
            city = null, venueName = null, videoUrl = null, isOutdoor = null,
            visibility = null, requireAge = null, status = null, minPrice = null,
            sponsors = null, ticketTypes = null, venue = null
        )

        val event = dto.toDomainModel()

        assertTrue(event.venueDetails.isEmpty())
    }

    @Test
    fun `EventDetailDto with partial venue only includes non-null fields`() {
        val dto = EventDetailDto(
            id = null, name = null, description = null, imageUrl = null, bannerUrl = null,
            featuredProfileIds = null, featuredProfiles = null,
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null, location = null, geohash = null,
            city = null, venueName = null, videoUrl = null, isOutdoor = null,
            visibility = null, requireAge = null, status = null, minPrice = null,
            sponsors = null, ticketTypes = null,
            venue = VenueDto(
                id = "vn-99", name = null,
                addressDetails = null, location = null,
                nearby = null, seatMapTemplate = null
            )
        )

        val event = dto.toDomainModel()

        assertEquals("vn-99", event.venueDetails["id"])
        assertEquals(false, event.venueDetails.containsKey("name"))
        assertEquals(false, event.venueDetails.containsKey("address"))
        assertEquals(false, event.venueDetails.containsKey("latitude"))
        assertEquals(false, event.venueDetails.containsKey("nearby"))
    }

    @Test
    fun `EventDetailDto with null lat-long location still produces lat-lon string`() {
        val dto = EventDetailDto(
            id = null, name = null, description = null, imageUrl = null, bannerUrl = null,
            featuredProfileIds = null, featuredProfiles = null,
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null,
            location = LocationDto(null, null),
            geohash = null, city = null, venueName = null, videoUrl = null,
            isOutdoor = null, visibility = null, requireAge = null,
            status = null, minPrice = null,
            sponsors = null, ticketTypes = null, venue = null
        )

        val event = dto.toDomainModel()

        assertEquals("Lat: 0.0, Lon: 0.0", event.location)
    }

    @Test
    fun `WeatherDto with all fields maps correctly`() {
        val dto = WeatherDto(
            temperature = 32.7,
            condition = "Clear",
            description = "clear sky",
            iconUrl = "https://example.com/icon.png"
        )

        val weather = dto.toDomainModel()

        assertEquals(32, weather.temperature)
        assertEquals("Clear", weather.condition)
        assertEquals("Clear sky", weather.description)
        assertEquals("https://example.com/icon.png", weather.iconUrl)
    }

    @Test
    fun `WeatherDto converts http iconUrl to https`() {
        val dto = WeatherDto(
            temperature = 28.0,
            condition = "Clouds",
            description = "overcast clouds",
            iconUrl = "http://example.com/icon.png"
        )

        val weather = dto.toDomainModel()

        assertEquals("https://example.com/icon.png", weather.iconUrl)
    }

    @Test
    fun `WeatherDto already https iconUrl stays unchanged`() {
        val dto = WeatherDto(
            temperature = 30.0,
            condition = "Sunny",
            description = "sunny day",
            iconUrl = "https://example.com/sun.png"
        )

        val weather = dto.toDomainModel()

        assertEquals("https://example.com/sun.png", weather.iconUrl)
    }

    @Test
    fun `WeatherDto rounds temperature down via toInt`() {
        val dto = WeatherDto(
            temperature = 27.3,
            condition = "Rain",
            description = "light rain",
            iconUrl = "https://example.com/r.png"
        )

        val weather = dto.toDomainModel()

        assertEquals(27, weather.temperature)
    }
}
