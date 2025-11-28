package com.tdtuer.eventing.data.mapper

import com.tdtuer.eventing.data.network.model.PromotionDto
import com.tdtuer.eventing.domain.model.Promotion

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
        isPublic = this.isPublic ?: true,
        eventId = this.eventId
    )
}