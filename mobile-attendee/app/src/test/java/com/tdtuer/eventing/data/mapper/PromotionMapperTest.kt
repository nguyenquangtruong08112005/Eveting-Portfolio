package com.tdtuer.eventing.data.mapper

import com.tdtuer.eventing.data.network.model.PromotionDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PromotionMapperTest {

    @Test
    fun promotionDto_toDomain_mapsAllFields() {
        val dto = PromotionDto(
            id = "promo-1",
            code = "SUMMER20",
            discountValue = 20.0,
            discountType = "percent",
            description = "Summer discount 20%",
            usageLimit = 100,
            usedCount = 10,
            validFrom = 1700000000000L,
            validUntil = 1800000000000L,
            minTicketQuantity = 2,
            isPublic = true,
            eventId = "evt-001"
        )

        val domain = dto.toDomain()

        assertEquals("promo-1", domain.id)
        assertEquals("SUMMER20", domain.code)
        assertEquals(20.0, domain.discountValue, 0.001)
        assertEquals("percent", domain.discountType)
        assertEquals("Summer discount 20%", domain.description)
        assertEquals(100, domain.usageLimit)
        assertEquals(10, domain.usedCount)
        assertEquals(1700000000000L, domain.validFrom)
        assertEquals(1800000000000L, domain.validUntil)
        assertEquals(2, domain.minTicketQuantity)
        assertEquals(true, domain.isPublic)
        assertEquals("evt-001", domain.eventId)
    }

    @Test
    fun promotionDto_toDomain_nullableFields_usesDefaults() {
        val dto = PromotionDto(
            id = "promo-2",
            code = "FLASH",
            discountValue = 50000.0,
            discountType = "amount",
            description = null,
            usageLimit = 50,
            usedCount = 5,
            validFrom = 1600000000000L,
            validUntil = 1700000000000L,
            minTicketQuantity = null,
            isPublic = null,
            eventId = null
        )

        val domain = dto.toDomain()

        assertEquals("promo-2", domain.id)
        assertEquals("FLASH", domain.code)
        assertEquals(50000.0, domain.discountValue, 0.001)
        assertEquals("amount", domain.discountType)
        assertEquals("", domain.description)
        assertEquals(50, domain.usageLimit)
        assertEquals(5, domain.usedCount)
        assertEquals(1600000000000L, domain.validFrom)
        assertEquals(1700000000000L, domain.validUntil)
        assertEquals(1, domain.minTicketQuantity)
        assertEquals(true, domain.isPublic)
        assertNull(domain.eventId)
    }

    @Test
    fun promotionDto_toDomain_nullableFields_explicitlyProvided() {
        val dto = PromotionDto(
            id = "promo-3",
            code = "VIP10",
            discountValue = 10.0,
            discountType = "percent",
            description = null,
            usageLimit = 1,
            usedCount = 0,
            validFrom = 0L,
            validUntil = 0L,
            minTicketQuantity = 5,
            isPublic = false,
            eventId = null
        )

        val domain = dto.toDomain()

        assertEquals("VIP10", domain.code)
        assertEquals(5, domain.minTicketQuantity)
        assertEquals(false, domain.isPublic)
        assertNull(domain.eventId)
    }
}
