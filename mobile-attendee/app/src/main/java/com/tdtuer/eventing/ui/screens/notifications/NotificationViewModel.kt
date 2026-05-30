package com.tdtuer.eventing.ui.screens.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.model.Notification
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.notifications.GetNotificationsUseCase
import com.tdtuer.eventing.domain.usecase.notifications.MarkNotificationReadUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NotificationViewModel @Inject constructor(
    // Inject UseCase thay vì Repository
    private val getNotificationsUseCase: GetNotificationsUseCase,
    private val markNotificationReadUseCase: MarkNotificationReadUseCase
) : ViewModel() {

    private val _notifications = MutableStateFlow<List<Notification>>(emptyList())
    val notifications: StateFlow<List<Notification>> = _notifications

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    init {
        loadNotifications()
    }

    private fun loadNotifications() {
        viewModelScope.launch {
            // Sử dụng UseCase
            getNotificationsUseCase().collect { result ->
                when (result) {
                    is Result.Loading -> _isLoading.value = true
                    is Result.Success -> {
                        _isLoading.value = false
                        _notifications.value = result.data
                    }

                    is Result.Failure -> {
                        _isLoading.value = false
                        // Handle error (ví dụ: log lỗi hoặc show toast qua state)
                    }
                }
            }
        }
    }

    fun markAsRead(notification: Notification) {
        // Chỉ gọi API nếu chưa đọc để tiết kiệm tài nguyên
        if (notification.isRead) return

        viewModelScope.launch {
            // Sử dụng UseCase
            markNotificationReadUseCase(notification.id)
            // Repository đã handle update local cache, flow getNotificationsUseCase sẽ tự emit data mới
        }
    }

    fun onMoreOptionsClick() {
        // TODO: Implement more options logic
    }
}