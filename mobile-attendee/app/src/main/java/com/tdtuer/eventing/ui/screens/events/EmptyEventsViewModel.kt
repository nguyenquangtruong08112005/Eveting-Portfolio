package com.tdtuer.eventing.ui.screens.events

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel

class EmptyEventsViewModel : ViewModel() {
    var selectedTabIndex by mutableStateOf(0)
        private set

    val tabs = listOf("UPCOMING", "PAST EVENTS")

    fun onTabSelected(index: Int) {
        selectedTabIndex = index
    }

    fun onBackNavigationClick() {
        // TODO: Implement back navigation logic
        println("Back navigation clicked from EmptyEventsScreen")
    }

    fun onMoreOptionsClick() {
        // TODO: Implement more options functionality
        println("More options clicked from EmptyEventsScreen")
    }

    fun onExploreEventsClick() {
        // TODO: Implement explore events logic (e.g., navigate to AllEventsScreen)
        println("Explore Events clicked")
    }
}
