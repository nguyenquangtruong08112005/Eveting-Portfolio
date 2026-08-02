package com.tdtuer.eventing_organizer.data.mapper

import com.tdtuer.eventing_organizer.data.network.model.AddressDetailsDto
import com.tdtuer.eventing_organizer.data.network.model.EventSummaryDto
import com.tdtuer.eventing_organizer.data.network.model.TicketDetailResponse
import com.tdtuer.eventing_organizer.data.network.model.TicketDto
import com.tdtuer.eventing_organizer.data.network.model.TicketEventSummaryDto
import com.tdtuer.eventing_organizer.data.network.model.UserTicketDto
import com.tdtuer.eventing_organizer.data.network.model.VenueSummaryDto
import com.tdtuer.eventing_organizer.domain.model.DetailedTicket
import com.tdtuer.eventing_organizer.domain.model.Ticket
import com.tdtuer.eventing_organizer.helpers.formatTimestampToDay
import com.tdtuer.eventing_organizer.helpers.formatTimestampToHour
import com.tdtuer.eventing_organizer.helpers.formatTimestampToMinute
import com.tdtuer.eventing_organizer.helpers.formatTimestampToMonth
import com.tdtuer.eventing_organizer.helpers.formatTimestampToYear
import com.tdtuer.eventing_organizer.ui.model.MyTicketUiModel
import com.tdtuer.eventing_organizer.ui.model.TicketStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TicketMapperTest {

    private val fixedTimestamp = 1700000000000L

    @Test
    fun `TicketDetailResponse with all fields maps to DetailedTicket correctly`() {
        val dto = TicketDetailResponse(
            ticket = TicketDto(
                id = "tkt-001",
                eventId = "evt-001",
                userId = "usr-001",
                type = "VIP",
                price = 199.99,
                qrCode = "qr-data-xyz",
                purchaseDate = fixedTimestamp,
                status = "paid"
            ),
            event = EventSummaryDto(
                name = "Summer Festival",
                date = fixedTimestamp + 86400000L,
                bannerUrl = "https://example.com/banner.jpg",
                venueName = "Main Hall"
            ),
            venue = VenueSummaryDto(
                name = "Grand Arena",
                addressDetails = AddressDetailsDto(
                    street = "123 Main St",
                    ward = "Ward 5",
                    district = "District 1",
                    city = "Ho Chi Minh City"
                )
            )
        )

        val result: DetailedTicket = dto.toDomainModel()

        assertEquals("tkt-001", result.id)
        assertEquals("VIP", result.ticketType)
        assertEquals(199.99, result.price, 0.0)
        assertEquals("qr-data-xyz", result.qrCode)
        assertEquals(fixedTimestamp, result.purchaseDate)
        assertEquals("paid", result.status)
        assertEquals("Summer Festival", result.eventName)
        assertEquals(fixedTimestamp + 86400000L, result.eventDate)
        assertEquals("https://example.com/banner.jpg", result.eventBannerUrl)
        assertEquals("Grand Arena", result.venueName)
        assertEquals("123 Main St, Ward 5, District 1, Ho Chi Minh City", result.fullAddress)
    }

    @Test
    fun `TicketDetailResponse with null address fields includes null literals in string`() {
        val dto = TicketDetailResponse(
            ticket = TicketDto(
                id = "tkt-002", eventId = "evt-002", userId = "usr-002",
                type = "Standard", price = 50.0, qrCode = "qr2",
                purchaseDate = fixedTimestamp, status = "pending"
            ),
            event = EventSummaryDto(
                name = "Art Expo", date = fixedTimestamp, bannerUrl = "", venueName = ""
            ),
            venue = VenueSummaryDto(
                name = "Gallery",
                addressDetails = AddressDetailsDto(
                    street = null, ward = null, district = null, city = null
                )
            )
        )

        val result = dto.toDomainModel()

        assertEquals("null, null, null, null", result.fullAddress)
    }

    @Test
    fun `UserTicketDto with all fields maps to MyTicketUiModel correctly`() {
        val dto = UserTicketDto(
            id = "tkt-100",
            status = "paid",
            type = "VIP",
            price = 299.99,
            seat = "A12",
            qrCode = "qr-vip-100",
            purchaseDate = fixedTimestamp,
            event = TicketEventSummaryDto(
                id = "evt-100",
                name = "Rock Concert",
                date = fixedTimestamp,
                imageUrl = "https://example.com/rock.jpg",
                venueName = "Stadium",
                city = "Hanoi",
                status = "active"
            )
        )

        val result: MyTicketUiModel = dto.toMyTicketUiModel()

        assertEquals("tkt-100", result.ticketId)
        assertEquals("Rock Concert", result.eventName)
        assertEquals("https://example.com/rock.jpg", result.eventImageUrl)
        assertEquals("Stadium, Hanoi", result.location)
        assertEquals("VIP", result.ticketType)
        assertEquals(TicketStatus.PAID, result.status)
        assertEquals(299.99, result.price, 0.0)
        assertEquals(fixedTimestamp, result.eventTimestamp)
        assertEquals("evt-100", result.eventId)
        assertNull(result.weather)
    }

    @Test
    fun `UserTicketDto with null optionals uses empty string fallbacks`() {
        val dto = UserTicketDto(
            id = "tkt-200",
            status = "pending",
            type = "Standard",
            price = 0.0,
            seat = null,
            qrCode = null,
            purchaseDate = fixedTimestamp,
            event = TicketEventSummaryDto(
                id = "evt-200",
                name = "Meetup",
                date = fixedTimestamp,
                imageUrl = null,
                venueName = null,
                city = null,
                status = null
            )
        )

        val result = dto.toMyTicketUiModel()

        assertEquals("", result.eventImageUrl)
        assertEquals(", ", result.location)
        assertEquals(TicketStatus.PENDING, result.status)
    }

    @Test
    fun `UserTicketDto status paid maps to PAID`() {
        val dto = UserTicketDto(
            id = "1", status = "paid", type = "", price = 0.0,
            seat = null, qrCode = null, purchaseDate = 0L,
            event = TicketEventSummaryDto("e1", "E", 0L, null, null, null, null)
        )
        assertEquals(TicketStatus.PAID, dto.toMyTicketUiModel().status)
    }

    @Test
    fun `UserTicketDto status checkedIn maps to CHECKED_IN`() {
        val dto = UserTicketDto(
            id = "2", status = "checkedIn", type = "", price = 0.0,
            seat = null, qrCode = null, purchaseDate = 0L,
            event = TicketEventSummaryDto("e2", "E", 0L, null, null, null, null)
        )
        assertEquals(TicketStatus.CHECKED_IN, dto.toMyTicketUiModel().status)
    }

    @Test
    fun `UserTicketDto status cancelled maps to CANCELLED`() {
        val dto = UserTicketDto(
            id = "3", status = "cancelled", type = "", price = 0.0,
            seat = null, qrCode = null, purchaseDate = 0L,
            event = TicketEventSummaryDto("e3", "E", 0L, null, null, null, null)
        )
        assertEquals(TicketStatus.CANCELLED, dto.toMyTicketUiModel().status)
    }

    @Test
    fun `UserTicketDto unknown status maps to UNKNOWN`() {
        val dto = UserTicketDto(
            id = "4", status = "invalidStatus", type = "", price = 0.0,
            seat = null, qrCode = null, purchaseDate = 0L,
            event = TicketEventSummaryDto("e4", "E", 0L, null, null, null, null)
        )
        assertEquals(TicketStatus.UNKNOWN, dto.toMyTicketUiModel().status)
    }

    @Test
    fun `UserTicketDto date formatting produces correct components`() {
        val dto = UserTicketDto(
            id = "5", status = "paid", type = "GA", price = 10.0,
            seat = null, qrCode = null, purchaseDate = 0L,
            event = TicketEventSummaryDto("e5", "Event", fixedTimestamp, null, null, null, null)
        )

        val result = dto.toMyTicketUiModel()
        val expectedDay = formatTimestampToDay(fixedTimestamp)
        val expectedMonth = formatTimestampToMonth(fixedTimestamp)
        val expectedYear = formatTimestampToYear(fixedTimestamp)
        val expectedHour = formatTimestampToHour(fixedTimestamp)
        val expectedMinute = formatTimestampToMinute(fixedTimestamp)

        assertEquals("$expectedDay $expectedMonth, $expectedYear", result.fullDate)
        assertEquals("$expectedHour:$expectedMinute", result.fullTime)
    }

    @Test
    fun `Ticket isPaid returns true when status is paid`() {
        val ticket = Ticket(status = "paid")
        assertTrue(ticket.isPaid())
    }

    @Test
    fun `Ticket isPaid returns false when status is pending`() {
        val ticket = Ticket(status = "pending")
        assertFalse(ticket.isPaid())
    }

    @Test
    fun `Ticket isPaid returns false when status is cancelled`() {
        val ticket = Ticket(status = "cancelled")
        assertFalse(ticket.isPaid())
    }

    @Test
    fun `Ticket isPaid returns false when status is checkedIn`() {
        val ticket = Ticket(status = "checkedIn")
        assertFalse(ticket.isPaid())
    }

    @Test
    fun `Ticket isPaid returns false when status is empty`() {
        val ticket = Ticket(status = "")
        assertFalse(ticket.isPaid())
    }

    @Test
    fun `Ticket isPaid returns false for default status`() {
        val ticket = Ticket()
        assertEquals("pending", ticket.status)
        assertFalse(ticket.isPaid())
    }
}
