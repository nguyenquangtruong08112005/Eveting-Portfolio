package com.tdtuer.eventing.domain.usecase.notifications

import com.tdtuer.eventing.data.repository.NotificationRepository
import com.tdtuer.eventing.domain.model.Notification
import com.tdtuer.eventing.domain.model.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

/**
 * UseCase để lấy danh sách thông báo của người dùng.
 */
class GetNotificationsUseCase @Inject constructor(
    private val repository: NotificationRepository
) {
    /**
     * @return Flow trả về danh sách Notification được bọc trong Result.
     */
    operator fun invoke(): Flow<Result<List<Notification>>> {
        return repository.getNotifications()
    }
}