package com.tdtuer.eventing_organizer.data.mapper

import com.tdtuer.eventing_organizer.data.network.model.NotificationDto
import com.tdtuer.eventing_organizer.domain.model.NotificationType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NotificationMapperTest {

    @Test
    fun `NotificationDto with reminder type maps to REMINDER`() {
        val dto = NotificationDto(
            id = "notif-001",
            title = "Event Reminder",
            message = "Your event starts in 1 hour",
            type = "reminder",
            eventId = "evt-001",
            isRead = false,
            createdAt = System.currentTimeMillis() - 3600000
        )

        val result = dto.toDomainModel()

        assertEquals("notif-001", result.id)
        assertEquals("Event Reminder", result.title)
        assertEquals("Your event starts in 1 hour", result.message)
        assertEquals(NotificationType.REMINDER, result.type)
        assertEquals("evt-001", result.eventId)
        assertEquals(false, result.isRead)
        assertNotNull(result.timeAgo)
    }

    @Test
    fun `NotificationDto with update type maps to UPDATE`() {
        val dto = NotificationDto(
            id = "notif-002", title = "Update", message = "Event updated",
            type = "update", eventId = null, isRead = true, createdAt = 1000
        )

        val result = dto.toDomainModel()

        assertEquals(NotificationType.UPDATE, result.type)
    }

    @Test
    fun `NotificationDto with promotion type maps to PROMOTION`() {
        val dto = NotificationDto(
            id = "notif-003", title = "Promo", message = "50% off",
            type = "promotion", eventId = null, isRead = false, createdAt = 2000
        )

        val result = dto.toDomainModel()

        assertEquals(NotificationType.PROMOTION, result.type)
    }

    @Test
    fun `NotificationDto with system type maps to SYSTEM`() {
        val dto = NotificationDto(
            id = "notif-004", title = "System", message = "Maintenance",
            type = "system", eventId = null, isRead = false, createdAt = 3000
        )

        val result = dto.toDomainModel()

        assertEquals(NotificationType.SYSTEM, result.type)
    }

    @Test
    fun `NotificationDto with unknown type string maps to UNKNOWN`() {
        val dto = NotificationDto(
            id = "notif-005", title = "Unknown", message = "Something",
            type = "invite", eventId = null, isRead = false, createdAt = 4000
        )

        val result = dto.toDomainModel()

        assertEquals(NotificationType.UNKNOWN, result.type)
    }

    @Test
    fun `NotificationDto with another unknown type string maps to UNKNOWN`() {
        val dtos = listOf("follow", "like", "join", "bogus")
        for (typeStr in dtos) {
            val dto = NotificationDto(
                id = "x", title = "T", message = "M",
                type = typeStr, eventId = null, isRead = false, createdAt = 5000
            )
            assertEquals(NotificationType.UNKNOWN, dto.toDomainModel().type)
        }
    }

    @Test
    fun `NotificationDto with eventId null preserves null`() {
        val dto = NotificationDto(
            id = "notif-006", title = "No Event", message = "General",
            type = "system", eventId = null, isRead = false, createdAt = 6000
        )

        val result = dto.toDomainModel()

        assertEquals(null, result.eventId)
    }

    @Test
    fun `NotificationDto with isRead true maps correctly`() {
        val dto = NotificationDto(
            id = "notif-007", title = "Read", message = "Already seen",
            type = "reminder", eventId = null, isRead = true, createdAt = 7000
        )

        val result = dto.toDomainModel()

        assertEquals(true, result.isRead)
    }

    @Test
    fun `NotificationDto with all fields populated maps all fields`() {
        val dto = NotificationDto(
            id = "notif-008",
            title = "Big News",
            message = "Something important happened",
            type = "update",
            eventId = "evt-099",
            isRead = false,
            createdAt = 1000000
        )

        val result = dto.toDomainModel()

        assertEquals("notif-008", result.id)
        assertEquals("Big News", result.title)
        assertEquals("Something important happened", result.message)
        assertEquals(NotificationType.UPDATE, result.type)
        assertEquals("evt-099", result.eventId)
        assertEquals(false, result.isRead)
        assertNotNull(result.timeAgo)
    }
}
