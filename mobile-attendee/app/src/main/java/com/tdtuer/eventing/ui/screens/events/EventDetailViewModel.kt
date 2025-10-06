package com.tdtuer.eventing.ui.screens.eventdetail

import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

// --- Data Models ---
data class Organizer(
    val name: String,
    val title: String,
    val avatar: Int
)

data class EventDetails(
    val title: String,
    val location: String,
    val date: String,
    val memberCount: String,
    val attendeeAvatars: List<Int>,
    val organizer: Organizer,
    val description: String
)

class EventDetailViewModel : ViewModel() {

    private val _eventDetails = MutableStateFlow<EventDetails?>(null)
    val eventDetails: StateFlow<EventDetails?> = _eventDetails

    init {
        loadEventDetails()
    }

    private fun loadEventDetails() {
        // This is where you would fetch data from a repository
        _eventDetails.value = EventDetails(
            title = "Shere Bangla Concert",
            location = "ABC Avenue, Dhaka",
            date = "25-27 October, 22",
            memberCount = "15.7k",
            attendeeAvatars = listOf(
                R.drawable.default_pfp, // Replace with your avatar drawables
                R.drawable.default_pfp,
                R.drawable.default_pfp,
                R.drawable.default_pfp
            ),
            organizer = Organizer(
                name = "Tamim Ikram",
                title = "Event Organiser",
                avatar = R.drawable.default_pfp // Replace with your avatar
            ),
            description = "Ultricies arcu venenatis in lorem faucibus lobortis at. East odio varius nisi congue aliquam nunc est sit pull convallis magna. Est scelerisque dignissim non nibh.... "
        )
    }

    // --- UI Event Handlers ---
    fun onBackClick() { println("Back clicked") }
    fun onFavoriteClick() { println("Favorite clicked") }
    fun onCallClick() { println("Call clicked") }
    fun onDirectionsClick() { println("Directions clicked") }
    fun onMyTicketClick() { println("My Ticket clicked") }
    fun onViewAllInviteClick() { println("View All / Invite clicked") }
    fun onOrganizerChatClick() { println("Organizer Chat clicked") }
    fun onOrganizerCallClick() { println("Organizer Call clicked") }
    fun onReadMoreClick() { println("Read More clicked") }
    fun onMessagesButtonClick() { println("Messages Button clicked") }
}