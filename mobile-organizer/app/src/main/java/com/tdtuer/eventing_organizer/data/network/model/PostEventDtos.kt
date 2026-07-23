package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

// --- 1. REVIEWS DTOs ---

data class ReviewResponse(
    @SerializedName("reviews") val reviews: List<ReviewDto>,
    @SerializedName("pagination") val pagination: PaginationDto?
)

data class ReviewDto(
    @SerializedName("id") val id: String,
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String,
    @SerializedName("createdAt") val createdAt: Long,
    @SerializedName("user") val user: UserSummaryDto? // Info người review
)

// DTO dùng chung cho user rút gọn trong Review và Media
data class UserSummaryDto(
    @SerializedName("name") val name: String?,
    @SerializedName("profilePicUrl") val profilePicUrl: String?
)

data class PostReviewRequest(
    @SerializedName("rating") val rating: Int,
    @SerializedName("comment") val comment: String
)

// --- 2. MEDIA DTOs ---

data class MediaResponse(
    @SerializedName("media") val media: List<MediaDto>,
    @SerializedName("pagination") val pagination: PaginationDto?
)

data class MediaDto(
    @SerializedName("id") val id: String,
    @SerializedName("url") val url: String,
    @SerializedName("type") val type: String, // "image" hoặc "video"
    @SerializedName("user") val user: UserSummaryDto?
)

// Request body cho API POST media (Bulk Upload)
data class PostMediaRequest(
    @SerializedName("mediaItems") val mediaItems: List<MediaItemRequest>
)

data class MediaItemRequest(
    @SerializedName("url") val url: String,
    @SerializedName("type") val type: String = "image",
    @SerializedName("caption") val caption: String = ""
)