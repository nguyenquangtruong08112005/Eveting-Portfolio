package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

// DTO nhận từ Server
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

// DTO tạo mới
data class CreatePromotionRequest(
    @SerializedName("code") val code: String,
    @SerializedName("discountValue") val discountValue: Double,
    @SerializedName("discountType") val discountType: String, // "percent" | "amount"
    @SerializedName("description") val description: String,
    @SerializedName("usageLimit") val usageLimit: Int,
    @SerializedName("validFrom") val validFrom: Long,
    @SerializedName("validUntil") val validUntil: Long,
    @SerializedName("minTicketQuantity") val minTicketQuantity: Int,
    @SerializedName("isPublic") val isPublic: Boolean,
    @SerializedName("eventId") val eventId: String? = null
)

// DTO cập nhật
data class UpdatePromotionRequest(
    @SerializedName("usageLimit") val usageLimit: Int? = null,
    @SerializedName("validUntil") val validUntil: Long? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("isPublic") val isPublic: Boolean? = null
)