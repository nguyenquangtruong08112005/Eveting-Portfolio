package com.tdtuer.eventing.data.mapper

import android.text.format.DateUtils
import com.tdtuer.eventing.data.network.model.NotificationDto
import com.tdtuer.eventing.domain.model.Notification
import com.tdtuer.eventing.domain.model.NotificationType

fun NotificationDto.toDomainModel(): Notification {
    val timeAgo = DateUtils.getRelativeTimeSpanString(
        this.createdAt,
        System.currentTimeMillis(),
        DateUtils.MINUTE_IN_MILLIS
    ).toString()

    val typeEnum = when (this.type) {
        "reminder" -> NotificationType.REMINDER
        "update" -> NotificationType.UPDATE
        "promotion" -> NotificationType.PROMOTION
        "system" -> NotificationType.SYSTEM
        // Map thêm các type khác nếu server trả về
        else -> NotificationType.UNKNOWN
    }

    return Notification(
        id = this.id,
        title = this.title,
        message = this.message,
        type = typeEnum,
        eventId = this.eventId,
        isRead = this.isRead,
        timeAgo = timeAgo
    )
}