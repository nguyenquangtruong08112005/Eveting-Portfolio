package com.tdtuer.eventing.data.network.model

import com.google.gson.annotations.SerializedName

data class ApplyPromotionRequest(
    val code: String,
    val eventId: String,
    val quantity: Int = 1
)

// Thêm Response Model
data class PromotionResponse(
    val valid: Boolean,
    val message: String,
    val discountType: String?, // "percent" hoặc "amount"
    val discountValue: Double?,
    val code: String?
)

data class PromotionDto(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("discountValue") val discountValue: Double,
    @SerializedName("discountType") val discountType: String,
    @SerializedName("description") val description: String?,
    @SerializedName("usageLimit") val usageLimit: Int,
    @SerializedName("usedCount") val usedCount: Int,
    @SerializedName("validFrom") val validFrom: Long,
    @SerializedName("validUntil") val validUntil: Long,
    @SerializedName("minTicketQuantity") val minTicketQuantity: Int?,
    @SerializedName("isPublic") val isPublic: Boolean?,
    @SerializedName("eventId") val eventId: String?
)