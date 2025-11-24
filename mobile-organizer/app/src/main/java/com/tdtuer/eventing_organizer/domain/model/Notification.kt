package com.tdtuer.eventing_organizer.domain.model

data class Notification(
    val id: String,
    val title: String,
    val message: String,
    val type: NotificationType,
    val eventId: String?,
    val isRead: Boolean,
    val timeAgo: String
)

enum class NotificationType {
    REMINDER, UPDATE, PROMOTION, SYSTEM, UNKNOWN, INVITE, FOLLOW, LIKE, JOIN
}