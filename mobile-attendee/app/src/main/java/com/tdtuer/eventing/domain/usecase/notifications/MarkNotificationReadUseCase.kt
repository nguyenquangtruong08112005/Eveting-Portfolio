package com.tdtuer.eventing.domain.usecase.notifications

import com.tdtuer.eventing.data.repository.NotificationRepository
import com.tdtuer.eventing.domain.model.Result
import javax.inject.Inject

/**
 * UseCase để đánh dấu một thông báo là đã đọc.
 */
class MarkNotificationReadUseCase @Inject constructor(
    private val repository: NotificationRepository
) {
    /**
     * @param notificationId ID của thông báo cần đánh dấu.
     */
    suspend operator fun invoke(notificationId: String): Result<Unit> {
        return repository.markAsRead(notificationId)
    }
}