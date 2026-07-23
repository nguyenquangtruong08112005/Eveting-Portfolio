package com.tdtuer.eventing.domain.model

data class User(
    val id: String = "",
    val email: String = "",
    val name: String = "",
    val profilePicUrl: String = "",
    val coverPhotoUrl: String = "",
    val isOrganizer: Boolean = false,
    val bio: String = "",
    val birthDate: Long = 0L,
    val address: String = "",
    val interests: List<String> = emptyList(),
    val followersCount: Int = 0,
    val followingCount: Int = 0,
    val followedProfileIds: List<String> = emptyList(),
    val joinedEvents: List<JoinedEvent> = emptyList(),
    val role: List<String> = listOf("attendee"),
    val fcmTokens: List<String> = emptyList()
)

data class JoinedEvent(
    val id: String,
    val name: String,
    val date: Long,
    val imageUrl: String
)