package com.tdtuer.eventing.data.mapper

import com.tdtuer.eventing.data.local.entity.NotificationEntity
import com.tdtuer.eventing.data.local.entity.toDomain
import com.tdtuer.eventing.data.local.entity.toEntity
import com.tdtuer.eventing.data.network.model.NotificationDto
import com.tdtuer.eventing.domain.model.NotificationType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Tests for Notification-related mappers.
 *
 * Note: [NotificationDto.toDomainModel] in NotificationMapper.kt
 * uses android.text.format.DateUtils.getRelativeTimeSpanString
 * which requires the Android framework and cannot run as a JVM
 * unit test. The tests below cover entity-layer mappers instead.
 *
 * Branches NOT tested (Android-only):
 * - NotificationDto.toDomainModel() type enum mapping
 * - NotificationDto.toDomainModel() timeAgo formatting via DateUtils
 */
class NotificationMapperTest {

    @Test
    fun notificationDto_toEntity_mapsAllFields() {
        val dto = NotificationDto(
            id = "notif-1",
            title = "New Event",
            message = "You have a new invitation",
            type = "invite",
            eventId = "evt-99",
            isRead = false,
            createdAt = 1700000000000L
        )

        val entity = dto.toEntity(timeAgo = "2h ago")

        assertEquals("notif-1", entity.id)
        assertEquals("New Event", entity.title)
        assertEquals("You have a new invitation", entity.message)
        assertEquals("invite", entity.type)
        assertEquals("evt-99", entity.eventId)
        assertEquals(false, entity.isRead)
        assertEquals(1700000000000L, entity.createdAt)
        assertEquals("2h ago", entity.timeAgo)
    }

    @Test
    fun notificationDto_toEntity_nullEventId() {
        val dto = NotificationDto(
            id = "notif-2",
            title = "No Event",
            message = "System notification",
            type = "system",
            eventId = null,
            isRead = true,
            createdAt = 2000000000000L
        )

        val entity = dto.toEntity(timeAgo = "just now")

        assertEquals("notif-2", entity.id)
        assertEquals("system", entity.type)
        assertNull(entity.eventId)
        assertEquals(true, entity.isRead)
        assertEquals("just now", entity.timeAgo)
    }

    @Test
    fun notificationEntity_toDomain_mapsKnownTypeEnums() {
        val typeMappings = mapOf(
            "reminder" to NotificationType.REMINDER,
            "update" to NotificationType.UPDATE,
            "promotion" to NotificationType.PROMOTION,
            "system" to NotificationType.SYSTEM,
            "invite" to NotificationType.INVITE,
            "follow" to NotificationType.FOLLOW,
            "like" to NotificationType.LIKE,
            "join" to NotificationType.JOIN,
            "unknown_type" to NotificationType.UNKNOWN,
            "" to NotificationType.UNKNOWN
        )

        for ((rawType, expectedEnum) in typeMappings) {
            val entity = NotificationEntity(
                id = "n-1",
                title = "Title",
                message = "Msg",
                type = rawType,
                eventId = null,
                isRead = true,
                createdAt = 1000L,
                timeAgo = "1d ago"
            )

            val domain = entity.toDomain()
            assertEquals("Failed for type: $rawType", expectedEnum, domain.type)
            assertEquals("n-1", domain.id)
            assertEquals("Title", domain.title)
            assertEquals("Msg", domain.message)
            assertNull(domain.eventId)
            assertEquals(true, domain.isRead)
            assertEquals("1d ago", domain.timeAgo)
        }
    }
}
