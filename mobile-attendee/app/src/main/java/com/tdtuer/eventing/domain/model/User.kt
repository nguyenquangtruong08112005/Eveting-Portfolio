package com.tdtuer.eventing.domain.model

data class User(
    val id: String = "",
    val email: String = "",
    val role: List<String> = listOf("attendee"), // Sử dụng List thay cho Array
    val name: String = "",
    val profilePicUrl: String = "",
    val historyEventIds: List<String> = emptyList(),
    val followedArtistIds: List<String> = emptyList(),
    val points: Double = 0.0,
    val level: String = "basic",
    val matchingPreferences: Map<String, Any> = emptyMap(),
    val sharedMedia: List<Map<String, String>> = emptyList()
) {
    fun isOrganizer() = role.contains("organizer")

    // Firebase yêu cầu constructor không tham số để deserialization
    constructor() : this("", "", listOf("attendee"), "", "", emptyList(), emptyList(), 0.0, "basic", emptyMap(), emptyList())
}