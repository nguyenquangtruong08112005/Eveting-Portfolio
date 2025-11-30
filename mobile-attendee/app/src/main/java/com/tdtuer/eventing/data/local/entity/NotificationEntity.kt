package com.tdtuer.eventing.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.tdtuer.eventing.data.network.model.NotificationDto
import com.tdtuer.eventing.domain.model.Notification
import com.tdtuer.eventing.domain.model.NotificationType

@Entity(tableName = "notifications")
data class NotificationEntity(
    @PrimaryKey val id: String,
    val title: String,
    val message: String,
    val type: String,
    val eventId: String?,
    val isRead: Boolean,
    val createdAt: Long,
    val timeAgo: String // Lưu sẵn chuỗi hiển thị hoặc tính toán lại khi map
)

// Mapper: DTO -> Entity
fun NotificationDto.toEntity(timeAgo: String): NotificationEntity {
    return NotificationEntity(
        id = this.id,
        title = this.title,
        message = this.message,
        type = this.type,
        eventId = this.eventId,
        isRead = this.isRead,
        createdAt = this.createdAt,
        timeAgo = timeAgo
    )
}

// Mapper: Entity -> Domain
fun NotificationEntity.toDomain(): Notification {
    val typeEnum = when (this.type) {
        "reminder" -> NotificationType.REMINDER
        "update" -> NotificationType.UPDATE
        "promotion" -> NotificationType.PROMOTION
        "system" -> NotificationType.SYSTEM
        "invite" -> NotificationType.INVITE
        "follow" -> NotificationType.FOLLOW
        "like" -> NotificationType.LIKE
        "join" -> NotificationType.JOIN
        else -> NotificationType.UNKNOWN
    }

    return Notification(
        id = this.id,
        title = this.title,
        message = this.message,
        type = typeEnum,
        eventId = this.eventId,
        isRead = this.isRead,
        timeAgo = this.timeAgo
    )
}