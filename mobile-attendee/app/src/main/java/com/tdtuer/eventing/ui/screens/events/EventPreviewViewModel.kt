package com.tdtuer.eventing.ui.screens.eventpreview

import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

data class EventPreviewDetails(
    val title: String,
    val location: String,
    val date: String,
    val memberCount: String,
    val attendeeAvatars: List<Int>
)

class EventPreviewViewModel : ViewModel() {

    private val _eventDetails = MutableStateFlow<EventPreviewDetails?>(null)
    val eventDetails: StateFlow<EventPreviewDetails?> = _eventDetails

    init {
        loadEventDetails()
    }

    private fun loadEventDetails() {
        // Replace with actual data fetching logic
        _eventDetails.value = EventPreviewDetails(
            title = "Shere Bangla Band Music Concert",
            location = "ABC Avenue, Dhaka",
            date = "25-27 October, 22",
            memberCount = "15.7k",
            attendeeAvatars = listOf(
                R.drawable.default_pfp, // Replace with your avatar drawables
                R.drawable.default_pfp,
                R.drawable.default_pfp,
                R.drawable.default_pfp
            )
        )
    }

    // --- UI Event Handlers ---
    fun onBackClick() {
        println("Back clicked")
    }

    fun onFavoriteClick() {
        println("Favorite clicked")
    }

    fun onChooseSeatClick() {
        println("Choose Your Seat clicked")
    }
}