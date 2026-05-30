package com.tdtuer.eventing.ui.screens.postevent

import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.domain.model.Event

/**
 * UI State cho màn hình đăng tải kỷ niệm (Post Event/Memories).
 * Chứa toàn bộ dữ liệu cần thiết để render UI.
 */
data class PostEventUiState(
    val eventId: String = "",
    val event: Event? = null,
    val organizer: FeaturedProfileDto? = null,
    val reviews: List<ReviewItem> = emptyList(),
    val sharedMedia: List<MediaItem> = emptyList(),
    val userRating: Int = 0,
    val userReview: String = "",
    val isUploading: Boolean = false,
    val activeTab: Int = 0, // 0: Reviews, 1: Media
    val error: String? = null
)

/**
 * Data model đại diện cho một đánh giá hiển thị trên UI.
 */
data class ReviewItem(
    val userName: String,
    val avatarUrl: String,
    val rating: Int,
    val comment: String
)

/**
 * Data model đại diện cho một media item (ảnh/video).
 */
data class MediaItem(
    val url: String,
    val type: String
)