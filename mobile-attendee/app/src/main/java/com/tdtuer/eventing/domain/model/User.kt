package com.tdtuer.eventing.domain.model

data class User(
    val id: String = "",
    val email: String = "",
    // Không lưu passwordHash - dùng Firebase Auth
    val role: String = "attendee",  // Default attendee
    val name: String = "",
    val profilePicUrl: String = "",
    val historyEventIds: List<String> = emptyList(),
    val followedArtistIds: List<String> = emptyList(),
    val points: Double = 0.0,  // Sử dụng Double cho chính xác
    val level: String = "basic",
    val matchingPreferences: Map<String, Any> = emptyMap(),
    val sharedMedia: List<Map<String, String>> = emptyList()  // {eventId, mediaUrl}
) {
    fun isOrganizer() = role == "organizer"  // Helper method cho phân quyền
}