package com.tdtuer.eventing.ui.screens.notifications

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R // Assuming R class is correctly imported

// --- Data Models ---
data class NotificationItem(
    val id: Int,
    val userName: String,
    val userAvatarRes: Int,
    val timestamp: String,
    val type: NotificationType
)

sealed class NotificationType {
    data class Invite(val eventName: String) : NotificationType()
    object Follow : NotificationType()
    data class Like(val target: String) : NotificationType()
    data class Join(val eventName: String) : NotificationType()
}

class NotificationViewModel : ViewModel() {

    private val _notifications = mutableStateOf<List<NotificationItem>>(emptyList())
    val notifications: State<List<NotificationItem>> = _notifications

    init {
        loadNotifications()
    }

    private fun loadNotifications() {
        // Replace with actual data fetching logic
        _notifications.value = listOf(
            NotificationItem(1, "David Silbia", R.drawable.default_pfp, "Just now", NotificationType.Invite("Jo Malone London's Mother's")),
            NotificationItem(2, "Adnan Safi", R.drawable.default_pfp, "5 min ago", NotificationType.Follow),
            NotificationItem(3, "Joan Baker", R.drawable.default_pfp, "20 min ago", NotificationType.Invite("A virtual Evening of Smooth Jazz")),
            NotificationItem(4, "Ronald C. Kinch", R.drawable.default_pfp, "1 hr ago", NotificationType.Like("you events")),
            NotificationItem(5, "Clara Tolson", R.drawable.default_pfp, "9 hr ago", NotificationType.Join("your Event Gala Music Festival")),
            NotificationItem(6, "Jennifer Fritz", R.drawable.default_pfp, "Tue, 5:10 pm", NotificationType.Invite("International Kids Safe")),
            NotificationItem(7, "Eric G. Prickett", R.drawable.default_pfp, "Wed, 3:30 pm", NotificationType.Follow)
        )
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
