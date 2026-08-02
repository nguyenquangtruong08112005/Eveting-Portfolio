package com.tdtuer.eventing_organizer.data.mapper

import com.tdtuer.eventing_organizer.data.network.model.PromotionDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PromotionMapperTest {

    private val fullDto = PromotionDto(
        id = "promo-1",
        code = "WELCOME10",
        discountValue = 10.0,
        discountType = "percent",
        description = "10% off for new users",
        usageLimit = 100,
        usedCount = 5,
        validFrom = 1_700_000_000_000L,
        validUntil = 1_800_000_000_000L,
        minTicketQuantity = 2,
        isPublic = true,
        eventId = "event-1"
    )

    @Test
    fun `toDomain maps all fields correctly`() {
        val domain = fullDto.toDomain()

        assertEquals("promo-1", domain.id)
        assertEquals("WELCOME10", domain.code)
        assertEquals(10.0, domain.discountValue, 0.0)
        assertEquals("percent", domain.discountType)
        assertEquals("10% off for new users", domain.description)
        assertEquals(100, domain.usageLimit)
        assertEquals(5, domain.usedCount)
        assertEquals(1_700_000_000_000L, domain.validFrom)
        assertEquals(1_800_000_000_000L, domain.validUntil)
        assertEquals(2, domain.minTicketQuantity)
        assertEquals(true, domain.isPublic)
        assertEquals("event-1", domain.eventId)
    }

    @Test
    fun `toDomain defaults nullable description to empty string`() {
        val dto = fullDto.copy(description = null)
        assertEquals("", dto.toDomain().description)
    }

    @Test
    fun `toDomain defaults nullable minTicketQuantity to 1`() {
        val dto = fullDto.copy(minTicketQuantity = null)
        assertEquals(1, dto.toDomain().minTicketQuantity)
    }

    @Test
    fun `toDomain defaults nullable isPublic to false`() {
        val dto = fullDto.copy(isPublic = null)
        assertEquals(false, dto.toDomain().isPublic)
    }

    @Test
    fun `toDomain passes through explicit nullable fields`() {
        val dto = fullDto.copy(
            description = "explicit null description",
            minTicketQuantity = 5,
            isPublic = true,
            eventId = null
        )
        val domain = dto.toDomain()
        assertEquals("explicit null description", domain.description)
        assertEquals(5, domain.minTicketQuantity)
        assertEquals(true, domain.isPublic)
        assertEquals(null, domain.eventId)
    }

    @Test
    fun `isActive returns false when validUntil is in the past`() {
        val promo = fullDto.copy(validFrom = 0L, validUntil = 1L, usedCount = 0, usageLimit = 10).toDomain()
        assertFalse(promo.isActive())
    }

    @Test
    fun `isActive returns true when now is within valid range and not exhausted`() {
        val promo = fullDto.copy(
            validFrom = 0L,
            validUntil = Long.MAX_VALUE,
            usedCount = 0,
            usageLimit = 10
        ).toDomain()
        assertTrue(promo.isActive())
    }

    @Test
    fun `isActive returns false when usedCount equals usageLimit`() {
        val promo = fullDto.copy(
            validFrom = 0L,
            validUntil = Long.MAX_VALUE,
            usedCount = 10,
            usageLimit = 10
        ).toDomain()
        assertFalse(promo.isActive())
    }

    @Test
    fun `isActive returns false when usedCount exceeds usageLimit`() {
        val promo = fullDto.copy(
            validFrom = 0L,
            validUntil = Long.MAX_VALUE,
            usedCount = 15,
            usageLimit = 10
        ).toDomain()
        assertFalse(promo.isActive())
    }
}
