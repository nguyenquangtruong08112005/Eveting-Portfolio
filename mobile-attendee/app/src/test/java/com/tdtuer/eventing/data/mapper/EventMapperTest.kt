package com.tdtuer.eventing.data.mapper

import com.tdtuer.eventing.data.network.model.AddressDetailsDto
import com.tdtuer.eventing.data.network.model.EventDetailDto
import com.tdtuer.eventing.data.network.model.EventDto
import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.data.network.model.LocationDto
import com.tdtuer.eventing.data.network.model.PublicTicketTypeDto
import com.tdtuer.eventing.data.network.model.SponsorDto
import com.tdtuer.eventing.data.network.model.TicketTypeDto
import com.tdtuer.eventing.data.network.model.VenueDto
import com.tdtuer.eventing.data.network.model.WeatherDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class EventMapperTest {

    @Test
    fun eventDto_toDomainModel_allFieldsPresent() {
        val dto = EventDto(
            id = "evt-123",
            name = "Concert 2026",
            date = 1700000000000L,
            distanceKm = 5.2,
            location = LocationDto(10.762622, 106.660172),
            category = listOf("Music", "Rock"),
            eventType = "concert",
            videoUrl = "https://example.com/video.mp4",
            imageUrl = "https://example.com/image.jpg",
            bannerUrl = "https://example.com/banner.jpg",
            city = "Ho Chi Minh",
            venueName = "Stadium A",
            minPrice = 50.0
        )

        val domain = dto.toDomainModel()

        assertEquals("evt-123", domain.id)
        assertEquals("Concert 2026", domain.name)
        assertEquals(1700000000000L, domain.date)
        assertEquals(5.2, domain.distanceKm!!, 0.001)
        assertEquals("Stadium A, Ho Chi Minh", domain.location)
        assertEquals("Lat: 10.762622, Lon: 106.660172", domain.coordinates)
        assertEquals(listOf("Music", "Rock"), domain.category)
        assertEquals("https://example.com/video.mp4", domain.videoUrl)
        assertEquals("https://example.com/image.jpg", domain.imageUrl)
        assertEquals("https://example.com/banner.jpg", domain.bannerUrl)
        assertEquals("Ho Chi Minh", domain.city)
        assertEquals("Stadium A", domain.venueName)
        assertEquals(50.0, domain.minPrice!!, 0.001)
    }

    @Test
    fun eventDto_toDomainModel_nullFields_usesDefaults() {
        val dto = EventDto(
            id = null,
            name = null,
            date = null,
            distanceKm = null,
            location = null,
            category = null,
            eventType = null,
            videoUrl = null,
            imageUrl = null,
            bannerUrl = null,
            city = null,
            venueName = null,
            minPrice = null
        )

        val domain = dto.toDomainModel()

        assertEquals("", domain.id)
        assertEquals("", domain.name)
        assertEquals(0L, domain.date)
        assertEquals(null, domain.distanceKm)
        assertEquals("null, null", domain.location)
        assertEquals("", domain.coordinates)
        assertTrue(domain.category.isEmpty())
        assertEquals("", domain.videoUrl)
        assertEquals("", domain.imageUrl)
        assertEquals("", domain.bannerUrl)
        assertEquals("Viet Nam", domain.city)
        assertEquals("", domain.venueName)
        assertEquals(0.0, domain.minPrice!!, 0.001)
    }

    @Test
    fun eventDetailDto_toDomainModel_allFieldsPresent() {
        val dto = EventDetailDto(
            id = "detail-1",
            name = "Tech Conf",
            description = "Annual Tech Conference",
            imageUrl = "img.jpg",
            bannerUrl = "banner.jpg",
            featuredProfiles = listOf(FeaturedProfileDto(id = "prof-1", name = null, profileType = null, bio = null, imageUrl = null, genres = null, followerCount = null)),
            category = listOf("Tech"),
            tags = listOf("AI", "Kotlin"),
            date = 1000L,
            endDate = 2000L,
            eventType = "hybrid",
            onlineUrl = "https://zoom.us/j/123",
            location = LocationDto(1.0, 2.0),
            geohash = "gh123",
            city = "Da Nang",
            venueName = "Hall B",
            videoUrl = "vid.mp4",
            isOutdoor = true,
            status = "active",
            visibility = "private",
            requireAge = 18,
            sponsors = listOf(SponsorDto(name = "Google", logoUrl = null, level = null), SponsorDto(name = null, logoUrl = null, level = null)),
            minPrice = 100.0,
            ticketTypes = mapOf(
                "VIP" to PublicTicketTypeDto(price = 200L, quantity = 50, available = 10)
            ),
            venue = VenueDto(
                id = "v-1",
                name = "Hall B",
                addressDetails = AddressDetailsDto(street = "123 St", ward = "W1", district = "D1", city = "Da Nang"),
                location = LocationDto(1.0, 2.0),
                nearby = listOf("Bus Stop"),
                seatMapTemplate = null
            )
        )

        val domain = dto.toDomainModel()

        assertEquals("detail-1", domain.id)
        assertEquals("Tech Conf", domain.name)
        assertEquals("Annual Tech Conference", domain.description)
        assertEquals(18L, domain.requiredAge)
        assertEquals(listOf("Google", "Unknown Sponsor"), domain.sponsors)
        assertEquals(100.0, domain.minPrice!!, 0.001)
        assertTrue(domain.isOutdoor)
        assertEquals("hybrid", domain.eventType)
        assertEquals("Lat: 1.0, Lon: 2.0", domain.location)

        val vipTicket = domain.ticketTypes["VIP"]
        assertEquals(200L, vipTicket?.get("price"))

        val venueDetails = domain.venueDetails
        assertEquals("v-1", venueDetails["id"])
        assertEquals("Hall B", venueDetails["name"])
        assertEquals("123 St, W1, D1, Da Nang", venueDetails["address"])
        assertEquals(1.0, venueDetails["latitude"])
        assertEquals(2.0, venueDetails["longitude"])
        assertEquals(listOf("Bus Stop"), venueDetails["nearby"])
    }

    @Test
    fun eventDetailDto_toDomainModel_nullFields_usesDefaults() {
        val dto = EventDetailDto(
            id = null,
            name = null,
            description = null,
            imageUrl = null,
            bannerUrl = null,
            featuredProfiles = null,
            category = null,
            tags = null,
            date = null,
            endDate = null,
            eventType = null,
            onlineUrl = null,
            location = null,
            geohash = null,
            city = null,
            venueName = null,
            videoUrl = null,
            isOutdoor = null,
            status = null,
            visibility = null,
            requireAge = null,
            sponsors = null,
            minPrice = null,
            ticketTypes = null,
            venue = null
        )

        val domain = dto.toDomainModel()

        assertEquals("", domain.id)
        assertEquals("", domain.name)
        assertEquals("", domain.description)
        assertEquals(0L, domain.requiredAge)
        assertEquals("physical", domain.eventType)
        assertEquals("active", domain.status)
        assertEquals("public", domain.visibility)
        assertEquals("Viet Nam", domain.city)
        assertFalse(domain.isOutdoor)
        assertTrue(domain.sponsors.isEmpty())
        assertTrue(domain.ticketTypes.isEmpty())
        assertTrue(domain.venueDetails.isEmpty())
    }

    @Test
    fun weatherDto_toDomainModel_transformsCorrectly() {
        val dto = WeatherDto(
            temperature = 28.6,
            condition = "Rain",
            description = "light rain showers",
            iconUrl = "http://cdn.weather.com/icon.png"
        )

        val domain = dto.toDomainModel()

        assertEquals(28, domain.temperature)
        assertEquals("Rain", domain.condition)
        assertEquals("Light rain showers", domain.description)
        assertEquals("https://cdn.weather.com/icon.png", domain.iconUrl)
    }

    @Test
    fun weatherDto_toDomainModel_httpsUrlUnchanged() {
        val dto = WeatherDto(
            temperature = 30.0,
            condition = "Clear",
            description = "clear sky",
            iconUrl = "https://cdn.weather.com/icon.png"
        )

        val domain = dto.toDomainModel()

        assertEquals("https://cdn.weather.com/icon.png", domain.iconUrl)
    }

    @Test
    fun eventDto_toDomainModel_locationVenueNameNull_cityNonNull() {
        val dto = EventDto(
            id = "e1", name = "E", date = 1L, distanceKm = null,
            location = null, category = null, eventType = null,
            videoUrl = null, imageUrl = null, bannerUrl = null,
            city = "Hanoi", venueName = null, minPrice = null
        )
        val domain = dto.toDomainModel()
        assertEquals("null, Hanoi", domain.location)
    }

    @Test
    fun eventDto_toDomainModel_locationCityNull_venueNameNonNull() {
        val dto = EventDto(
            id = "e2", name = "E2", date = 2L, distanceKm = null,
            location = null, category = null, eventType = null,
            videoUrl = null, imageUrl = null, bannerUrl = null,
            city = null, venueName = "Stadium", minPrice = null
        )
        val domain = dto.toDomainModel()
        assertEquals("Stadium, null", domain.location)
    }

    @Test
    fun eventDetailDto_toDomainModel_venuePartialNulls() {
        val dto = EventDetailDto(
            id = null, name = null, description = null,
            imageUrl = null, bannerUrl = null, featuredProfiles = null,
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null, location = null,
            geohash = null, city = null, venueName = null, videoUrl = null,
            isOutdoor = null, status = null, visibility = null,
            requireAge = null, sponsors = null, minPrice = null,
            ticketTypes = null,
            venue = VenueDto(
                id = "v1", name = "Test Venue",
                addressDetails = null,
                location = null,
                nearby = null,
                seatMapTemplate = null
            )
        )
        val domain = dto.toDomainModel()
        val details = domain.venueDetails
        assertEquals("v1", details["id"])
        assertEquals("Test Venue", details["name"])
        assertEquals(2, details.size)
        assertFalse(details.containsKey("address"))
        assertFalse(details.containsKey("latitude"))
        assertFalse(details.containsKey("nearby"))
    }

    @Test
    fun weatherDto_toDomainModel_emptyDescription() {
        val dto = WeatherDto(
            temperature = 25.0,
            condition = "Clear",
            description = "",
            iconUrl = "https://example.com/icon.png"
        )
        val domain = dto.toDomainModel()
        assertEquals(25, domain.temperature)
        assertEquals("Clear", domain.condition)
        assertEquals("", domain.description)
        assertEquals("https://example.com/icon.png", domain.iconUrl)
    }

    @Test
    fun eventDetailDto_toDomainModel_emptySponsorsList() {
        val dto = EventDetailDto(
            id = null, name = null, description = null,
            imageUrl = null, bannerUrl = null, featuredProfiles = null,
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null, location = null,
            geohash = null, city = null, venueName = null, videoUrl = null,
            isOutdoor = null, status = null, visibility = null,
            requireAge = null, sponsors = emptyList(), minPrice = null,
            ticketTypes = null, venue = null
        )
        val domain = dto.toDomainModel()
        assertTrue(domain.sponsors.isEmpty())
    }

    @Test
    fun eventDetailDto_toDomainModel_emptyTicketTypes() {
        val dto = EventDetailDto(
            id = null, name = null, description = null,
            imageUrl = null, bannerUrl = null, featuredProfiles = null,
            category = null, tags = null, date = null, endDate = null,
            eventType = null, onlineUrl = null, location = null,
            geohash = null, city = null, venueName = null, videoUrl = null,
            isOutdoor = null, status = null, visibility = null,
            requireAge = null, sponsors = null, minPrice = null,
            ticketTypes = emptyMap(), venue = null
        )
        val domain = dto.toDomainModel()
        assertTrue(domain.ticketTypes.isEmpty())
    }
}
