package com.tdtuer.eventing.ui.screens.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.data.repository.NotificationRepository
import com.tdtuer.eventing.domain.model.Notification
import com.tdtuer.eventing.domain.model.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NotificationViewModel @Inject constructor(
    private val notificationRepository: NotificationRepository
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
            notificationRepository.getNotifications().collect { result ->
                when (result) {
                    is Result.Loading -> _isLoading.value = true
                    is Result.Success -> {
                        _isLoading.value = false
                        _notifications.value = result.data
                    }

                    is Result.Failure -> {
                        _isLoading.value = false
                        // Handle error
                    }
                }
            }
        }
    }

    fun markAsRead(notification: Notification) {
        viewModelScope.launch {
            notificationRepository.markAsRead(notification.id)
            // Có thể reload lại list hoặc update local state
        }
    }

    fun onBackPress() {
        // TODO: Implement back navigation logic
        println("Back pressed on Notification Screen")
    }

    fun onMoreOptionsClick() {
        // TODO: Implement more options logic
        println("More options clicked on Notification Screen")
    }

    fun onAcceptInvite(notificationId: Int) {
        // TODO: Implement accept invite logic
        println("Accepted invite for notification ID: $notificationId")
        // Example: Update notification state or call an API, then refresh _notifications.value
    }

    fun onRejectInvite(notificationId: Int) {
        // TODO: Implement reject invite logic
        println("Rejected invite for notification ID: $notificationId")
        // Example: Update notification state or call an API, then refresh _notifications.value
    }
}
