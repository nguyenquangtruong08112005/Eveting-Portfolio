package com.tdtuer.eventing_organizer.domain.model

data class User(
    val id: String = "",
    val email: String = "",
    val name: String = "", // Sẽ map từ userName
    val profilePicUrl: String = "",
    val coverPhotoUrl: String = "",
    val isOrganizer: Boolean = false,
    val isAdmin: Boolean = false,
    val bio: String = "", // Sẽ map từ aboutMe
    val birthDate: Long = 0L,
    val address: String = "",
    val interests: List<String> = emptyList(),
    val followersCount: Int = 0,
    val followingCount: Int = 0,
    val joinedEvents: List<JoinedEvent> = emptyList(), // List sự kiện tham gia
    val role: List<String> = listOf("attendee") // Giữ lại để tương thích ngược nếu cần
)

data class JoinedEvent(
    val id: String,
    val name: String,
    val date: Long,
    val imageUrl: String
)