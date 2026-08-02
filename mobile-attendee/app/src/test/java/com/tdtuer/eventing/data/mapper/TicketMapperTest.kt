package com.tdtuer.eventing.data.mapper

import com.tdtuer.eventing.data.network.model.AddressDetailsDto
import com.tdtuer.eventing.data.network.model.EventSummaryDto
import com.tdtuer.eventing.data.network.model.TicketDetailResponse
import com.tdtuer.eventing.data.network.model.TicketDto
import com.tdtuer.eventing.data.network.model.TicketEventSummaryDto
import com.tdtuer.eventing.data.network.model.UserTicketDto
import com.tdtuer.eventing.data.network.model.VenueSummaryDto
import com.tdtuer.eventing.ui.screens.ticket.TicketStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TicketMapperTest {

    @Test
    fun ticketDetailResponse_toDomainModel_mapsAllFields() {
        val response = TicketDetailResponse(
            ticket = TicketDto(
                id = "ticket-1",
                eventId = "evt-1",
                userId = "user-1",
                type = "VIP",
                price = 150.0,
                qrCode = "qr-data-abc",
                purchaseDate = 1700000000000L,
                status = "paid"
            ),
            event = EventSummaryDto(
                name = "Rock Concert",
                date = 1700100000000L,
                bannerUrl = "https://example.com/banner.jpg",
                venueName = "Main Hall"
            ),
            venue = VenueSummaryDto(
                name = "Main Hall",
                addressDetails = AddressDetailsDto(
                    street = "123 Rock St",
                    ward = "Ward 1",
                    district = "District 2",
                    city = "Ho Chi Minh"
                )
            )
        )

        val domain = response.toDomainModel()

        assertEquals("ticket-1", domain.id)
        assertEquals("VIP", domain.ticketType)
        assertEquals(150.0, domain.price, 0.001)
        assertEquals("qr-data-abc", domain.qrCode)
        assertEquals(1700000000000L, domain.purchaseDate)
        assertEquals("paid", domain.status)
        assertEquals("Rock Concert", domain.eventName)
        assertEquals(1700100000000L, domain.eventDate)
        assertEquals("https://example.com/banner.jpg", domain.eventBannerUrl)
        assertEquals("Main Hall", domain.venueName)
        assertEquals("123 Rock St, Ward 1, District 2, Ho Chi Minh", domain.fullAddress)
    }

    @Test
    fun ticketDetailResponse_toDomainModel_nullAddressParts() {
        val response = TicketDetailResponse(
            ticket = TicketDto(
                id = "ticket-2", eventId = "evt-2", userId = "user-2",
                type = "Standard", price = 50.0, qrCode = "qr2",
                purchaseDate = 1700000000000L, status = "pending"
            ),
            event = EventSummaryDto(
                name = "Jazz Night", date = 1700100000000L,
                bannerUrl = "banner.jpg", venueName = "Jazz Club"
            ),
            venue = VenueSummaryDto(
                name = "Jazz Club",
                addressDetails = AddressDetailsDto(
                    street = null, ward = null, district = null, city = null
                )
            )
        )

        val domain = response.toDomainModel()

        assertEquals("Jazz Club", domain.venueName)
        assertEquals("null, null, null, null", domain.fullAddress)
    }

    @Test
    fun userTicketDto_toMyTicketUiModel_mapsAllFields() {
        val dto = UserTicketDto(
            id = "ut-1",
            status = "paid",
            type = "VIP",
            price = 200.0,
            seat = "A1",
            qrCode = "qr-xyz",
            purchaseDate = 1700000000000L,
            event = TicketEventSummaryDto(
                id = "evt-1",
                name = "Summer Festival",
                date = 1700100000000L,
                imageUrl = "https://example.com/img.jpg",
                venueName = "Central Park",
                city = "New York",
                status = "active"
            )
        )

        val uiModel = dto.toMyTicketUiModel()

        assertEquals("ut-1", uiModel.ticketId)
        assertEquals("Summer Festival", uiModel.eventName)
        assertEquals("https://example.com/img.jpg", uiModel.eventImageUrl)
        assertEquals("VIP", uiModel.ticketType)
        assertEquals(TicketStatus.PAID, uiModel.status)
        assertEquals(200.0, uiModel.price, 0.001)
        assertEquals(1700100000000L, uiModel.eventTimestamp)
        assertEquals("evt-1", uiModel.eventId)
        assertTrue(uiModel.fullDate.isNotBlank())
        assertTrue(uiModel.fullTime.isNotBlank())
    }

    @Test
    fun userTicketDto_toMyTicketUiModel_nullableFields_defaultValues() {
        val dto = UserTicketDto(
            id = "ut-2",
            status = "checkedIn",
            type = "Standard",
            price = 0.0,
            seat = null,
            qrCode = null,
            purchaseDate = 1600000000000L,
            event = TicketEventSummaryDto(
                id = "evt-2",
                name = "Art Expo",
                date = 1600100000000L,
                imageUrl = null,
                venueName = null,
                city = null,
                status = null
            )
        )

        val uiModel = dto.toMyTicketUiModel()

        assertEquals("ut-2", uiModel.ticketId)
        assertEquals("Art Expo", uiModel.eventName)
        assertEquals("", uiModel.eventImageUrl)
        assertEquals(TicketStatus.CHECKED_IN, uiModel.status)
        assertEquals(1600100000000L, uiModel.eventTimestamp)
        assertTrue(uiModel.fullDate.isNotBlank())
        assertTrue(uiModel.fullTime.isNotBlank())
    }

    @Test
    fun userTicketDto_toMyTicketUiModel_mapsStatusCorrectly() {
        val baseEvent = TicketEventSummaryDto(
            id = "e1", name = "Test", date = 1000L,
            imageUrl = null, venueName = null, city = null, status = null
        )

        fun buildUserTicketDto(status: String) = UserTicketDto(
            id = "ut-$status", status = status, type = "T", price = 0.0,
            seat = null, qrCode = null, purchaseDate = 1000L, event = baseEvent
        )

        assertEquals(TicketStatus.PAID, buildUserTicketDto("paid").toMyTicketUiModel().status)
        assertEquals(TicketStatus.PAID, buildUserTicketDto("success").toMyTicketUiModel().status)
        assertEquals(TicketStatus.PENDING, buildUserTicketDto("pending").toMyTicketUiModel().status)
        assertEquals(TicketStatus.CANCELLED, buildUserTicketDto("cancelled").toMyTicketUiModel().status)
        assertEquals(TicketStatus.CANCELLED, buildUserTicketDto("failed").toMyTicketUiModel().status)
        assertEquals(TicketStatus.CHECKED_IN, buildUserTicketDto("checkedIn").toMyTicketUiModel().status)
        assertEquals(TicketStatus.UNKNOWN, buildUserTicketDto("unknown_status").toMyTicketUiModel().status)
        assertEquals(TicketStatus.UNKNOWN, buildUserTicketDto("").toMyTicketUiModel().status)
    }

    @Test
    fun userTicketDto_toMyTicketUiModel_locationExactFormat() {
        val dto = UserTicketDto(
            id = "ut-loc1", status = "paid", type = "VIP", price = 100.0,
            seat = null, qrCode = null, purchaseDate = 1000L,
            event = TicketEventSummaryDto(
                id = "e1", name = "Event", date = 1000L,
                imageUrl = null, venueName = "Stadium", city = "City",
                status = null
            )
        )
        val uiModel = dto.toMyTicketUiModel()
        assertEquals("Stadium, City", uiModel.location)
    }

    @Test
    fun userTicketDto_toMyTicketUiModel_locationBothNull() {
        val dto = UserTicketDto(
            id = "ut-loc2", status = "pending", type = "GA", price = 50.0,
            seat = null, qrCode = null, purchaseDate = 1000L,
            event = TicketEventSummaryDto(
                id = "e2", name = "Event2", date = 1000L,
                imageUrl = null, venueName = null, city = null,
                status = null
            )
        )
        val uiModel = dto.toMyTicketUiModel()
        assertEquals(", ", uiModel.location)
    }

    @Test
    fun userTicketDto_toMyTicketUiModel_locationOneSideNull() {
        val dto1 = UserTicketDto(
            id = "ut-loc3", status = "cancelled", type = "GA", price = 0.0,
            seat = null, qrCode = null, purchaseDate = 1000L,
            event = TicketEventSummaryDto(
                id = "e3", name = "Event3", date = 1000L,
                imageUrl = null, venueName = "Venue", city = null,
                status = null
            )
        )
        assertEquals("Venue, ", dto1.toMyTicketUiModel().location)

        val dto2 = UserTicketDto(
            id = "ut-loc4", status = "cancelled", type = "GA", price = 0.0,
            seat = null, qrCode = null, purchaseDate = 1000L,
            event = TicketEventSummaryDto(
                id = "e4", name = "Event4", date = 1000L,
                imageUrl = null, venueName = null, city = "City",
                status = null
            )
        )
        assertEquals(", City", dto2.toMyTicketUiModel().location)
    }
}
