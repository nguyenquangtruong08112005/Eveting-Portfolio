package com.tdtuer.eventing.ui.screens.events

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R // Assuming R class is available

// Data class for event details, can be expanded as needed
data class EventDetailsData(
    val title: String = "International Band Music Concert",
    val date: String = "14 December, 2021",
    val dateTimeSubtitle: String = "Tuesday, 4:00PM - 9:00PM",
    val locationTitle: String = "Gala Convention Center",
    val locationSubtitle: String = "36 Guild Street London, UK",
    val organizerAvatarRes: Int = R.drawable.default_pfp,
    val organizerName: String = "Ashfak Sayem",
    val organizerRole: String = "Organizer",
    val aboutEvent: String = "Enjoy your favorite dishe and a lovely your friends and family and have a great time.\nFood from local food trucks will be available for purchase.",
    val ticketPrice: String = "$120",
    val bannerImageRes: Int = R.drawable.banner_svgrepo_com,
    val goingFacePileAvatars: List<Int> = listOf(R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp),
    val goingCountText: String = "+20 Going"
)

class EventDetailsViewModel : ViewModel() {

    private val _eventDetails = mutableStateOf(EventDetailsData()) // Initialize with default/placeholder data
    val eventDetails: State<EventDetailsData> = _eventDetails

    // In a real app, you would load this data, e.g., from a repository based on an event ID
    // init {
    //     loadEventDetails(eventId = "some_event_id")
    // }

    // private fun loadEventDetails(eventId: String) {
    //     // viewModelScope.launch {
    //     //     _eventDetails.value = repository.getEventDetails(eventId)
    //     // }
    // }

    fun onBackNavigationClick() {
        // TODO: Implement back navigation logic
        println("Back navigation clicked")
    }

    fun onBookmarkClick() {
        // TODO: Implement bookmark toggle logic
        println("Bookmark clicked")
    }

    fun onInviteClick() {
        // TODO: Implement invite logic
        println("Invite clicked")
    }

    fun onFollowOrganizerClick() {
        // TODO: Implement follow/unfollow organizer logic
        println("Follow organizer clicked")
    }

    fun onBuyTicketClick() {
        // TODO: Implement buy ticket logic
        println("Buy Ticket clicked for price: ${eventDetails.value.ticketPrice}")
    }
}
