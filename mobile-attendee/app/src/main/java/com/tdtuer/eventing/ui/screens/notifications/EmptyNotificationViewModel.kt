package com.tdtuer.eventing.ui.screens.notifications

import androidx.lifecycle.ViewModel

class EmptyNotificationViewModel : ViewModel() {

    // You can add any state here if needed in the future, e.g., for different empty messages
    val notificationCount: Int = 0 // Example: The badge shows '0'
    val mainMessage: String = "No Notifications!"
    val subMessage: String = "Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor"

    fun onBackPress() {
        // TODO: Implement back navigation logic (e.g., pop backstack)
        println("Back pressed on Empty Notification Screen")
    }

    fun onMoreOptionsClick() {
        // TODO: Implement more options logic (e.g., show a dropdown menu)
        println("More options clicked on Empty Notification Screen")
    }
}
