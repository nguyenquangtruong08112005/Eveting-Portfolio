package com.tdtuer.eventing_organizer.data.mapper

import com.tdtuer.eventing_organizer.data.network.model.PromotionDto
import com.tdtuer.eventing_organizer.domain.model.Promotion

// Mapper Helper
fun PromotionDto.toDomain(): Promotion {
    return Promotion(
        id = this.id,
        code = this.code,
        discountValue = this.discountValue,
        discountType = this.discountType,
        description = this.description ?: "",
        usageLimit = this.usageLimit,
        usedCount = this.usedCount,
        validFrom = this.validFrom,
        validUntil = this.validUntil,
        minTicketQuantity = this.minTicketQuantity ?: 1,
        isPublic = this.isPublic ?: false,
        eventId = this.eventId
    )
}