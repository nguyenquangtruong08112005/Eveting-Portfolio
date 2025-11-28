package com.tdtuer.eventing.data.mapper

import com.tdtuer.eventing.data.network.model.JoinedEventDto
import com.tdtuer.eventing.data.network.model.UserDto
import com.tdtuer.eventing.domain.model.JoinedEvent
import com.tdtuer.eventing.domain.model.User

fun UserDto.toDomainModel(): User {
    return User(
        id = this.id ?: "",
        email = this.email ?: "",
        // Map userName từ server vào name của domain
        name = this.userName ?: "",
        profilePicUrl = this.profilePicUrl ?: "",
        coverPhotoUrl = this.coverPhotoUrl ?: "",
        isOrganizer = this.isOrganizer ?: false,
        // Map aboutMe từ server vào bio của domain
        bio = this.aboutMe ?: "",
        birthDate = this.birthDate ?: 0L,
        address = this.address ?: "",
        interests = this.interests ?: emptyList(),
        followersCount = this.followersCount ?: 0,
        followingCount = this.followingCount ?: 0,
        followedProfileIds = this.followedProfileIds ?: emptyList(),
        joinedEvents = this.joinedEvents?.map { it.toDomainModel() } ?: emptyList(),
        fcmTokens = emptyList()
    )
}

fun JoinedEventDto.toDomainModel(): JoinedEvent {
    return JoinedEvent(
        id = this.id ?: "",
        name = this.name ?: "",
        date = this.date ?: 0L,
        imageUrl = this.imageUrl ?: ""
    )
}