package com.tdtuer.eventing.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.tdtuer.eventing.domain.model.JoinedEvent
import com.tdtuer.eventing.domain.model.User

@Entity(tableName = "user_profile")
data class UserEntity(
    @PrimaryKey val id: String,
    val email: String,
    val name: String,
    val profilePicUrl: String,
    val coverPhotoUrl: String,
    val isOrganizer: Boolean,
    val bio: String,
    val birthDate: Long,
    val address: String,
    val followersCount: Int,
    val followingCount: Int,

    // Các trường List này sẽ được TypeConverter xử lý
    val interests: List<String>,
    val followedProfileIds: List<String>,
    val joinedEvents: List<JoinedEvent>,
    val role: List<String>,
    val fcmTokens: List<String>,

    val lastFetchedAt: Long = System.currentTimeMillis()
)

// Mapper: Domain -> Entity
fun User.toEntity(): UserEntity {
    return UserEntity(
        id = this.id,
        email = this.email,
        name = this.name,
        profilePicUrl = this.profilePicUrl,
        coverPhotoUrl = this.coverPhotoUrl,
        isOrganizer = this.isOrganizer,
        bio = this.bio,
        birthDate = this.birthDate,
        address = this.address,
        followersCount = this.followersCount,
        followingCount = this.followingCount,
        interests = this.interests,
        followedProfileIds = this.followedProfileIds,
        joinedEvents = this.joinedEvents,
        role = this.role,
        fcmTokens = this.fcmTokens
    )
}

// Mapper: Entity -> Domain
fun UserEntity.toDomain(): User {
    return User(
        id = this.id,
        email = this.email,
        name = this.name,
        profilePicUrl = this.profilePicUrl,
        coverPhotoUrl = this.coverPhotoUrl,
        isOrganizer = this.isOrganizer,
        bio = this.bio,
        birthDate = this.birthDate,
        address = this.address,
        followersCount = this.followersCount,
        followingCount = this.followingCount,
        interests = this.interests,
        followedProfileIds = this.followedProfileIds,
        joinedEvents = this.joinedEvents,
        role = this.role,
        fcmTokens = this.fcmTokens
    )
}