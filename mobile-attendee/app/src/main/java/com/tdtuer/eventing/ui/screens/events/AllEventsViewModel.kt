package com.tdtuer.eventing.ui.screens.events

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R // Assuming R class is in this package or imported correctly

// Data Model for EventListItem - kept here for now, or could be in a separate data model file
data class EventListItem(
    val title: String,
    val dateTime: String,
    val location: String,
    val imageRes: Int
)

class AllEventsViewModel : ViewModel() {
    private val _events = mutableStateOf<List<EventListItem>>(emptyList())
    val events: State<List<EventListItem>> = _events

    init {
        loadEvents()
    }

    private fun loadEvents() {
        // Replace with actual data fetching logic (e.g., from a repository)
        _events.value = listOf(
            EventListItem("Jo Malone London's Mother's Day Presents", "Wed, Apr 28 ⋅ 5:30 PM", "Radius Gallery ⋅ Santa Cruz, CA", R.drawable.banner_svgrepo_com),
            EventListItem("A Virtual Evening of Smooth Jazz", "Sat, May 1 ⋅ 2:00 PM", "Lot 13 ⋅ Oakland, CA", R.drawable.banner_svgrepo_com),
            EventListItem("Women's Leadership Conference 2021", "Sat, Apr 24 ⋅ 1:30 PM", "53 Bush St ⋅ San Francisco, CA", R.drawable.banner_svgrepo_com),
            EventListItem("International Kids Safe Parents Night Out", "Fri, Apr 23 ⋅ 6:00 PM", "Lot 13 ⋅ Oakland, CA", R.drawable.banner_svgrepo_com),
            EventListItem("Collectivity Plays the Music of Jimi", "Mon, Jun 21 ⋅ 10:00 PM", "Longboard Margarita Bar", R.drawable.banner_svgrepo_com),
            EventListItem("International Gala Music Festival", "Sun, Apr 25 ⋅ 10:15 AM", "36 Guild Street London, UK", R.drawable.banner_svgrepo_com)
        )
    }

    fun onBackNavigationClick() {
        // TODO: Implement back navigation logic
        println("Back navigation clicked")
    }

    fun onSearchClick() {
        // TODO: Implement search functionality
        println("Search clicked")
    }

    fun onMoreOptionsClick() {
        // TODO: Implement more options functionality
        println("More options clicked")
    }

    fun onEventItemClick(event: EventListItem) {
        // TODO: Implement navigation to event details or other action
        println("Event clicked: ${event.title}")
    }
}
