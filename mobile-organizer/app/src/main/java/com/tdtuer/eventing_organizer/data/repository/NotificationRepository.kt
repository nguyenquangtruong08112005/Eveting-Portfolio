package com.tdtuer.eventing_organizer.data.repository

import com.tdtuer.eventing_organizer.domain.model.Notification
import com.tdtuer.eventing_organizer.domain.model.Result
import kotlinx.coroutines.flow.Flow

interface NotificationRepository {
    fun getNotifications(): Flow<Result<List<Notification>>>
    suspend fun markAsRead(notificationId: String): Result<Unit>
}

