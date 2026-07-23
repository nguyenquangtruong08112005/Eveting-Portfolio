package com.tdtuer.eventing.ui.screens.profile

import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R // Assuming R class is available

// --- Data Models ---
data class EventItem(
    val id: Int,
    val date: String,
    val time: String,
    val title: String,
    val imageRes: Int
)

data class OrganizerProfileDetails(
    val profilePictureRes: Int = R.drawable.default_pfp,
    val userName: String = "David Silbia",
    val followingCount: Int = 350,
    val followersCount: Int = 346,
    val aboutContent: String = "Enjoy your favorite dishe and a lovely your friends and family and have a great time. Food from local food trucks will be available for purchase. Read More",
    val events: List<EventItem> = listOf(
        EventItem(1, "1ST MAY", "SAT -2:00 PM", "A virtual evening of smooth jazz", R.drawable.default_pfp),
        EventItem(2, "1ST MAY", "SAT -2:00 PM", "Jo malone london's mother's day", R.drawable.default_pfp),
        EventItem(3, "1ST MAY", "SAT -2:00 PM", "Women's leadership conference", R.drawable.default_pfp)
    )
)

class OrganizerProfileViewModel : ViewModel() {

    private val _profileDetails = mutableStateOf(OrganizerProfileDetails()) // Initialize with default/placeholder data
    val profileDetails: State<OrganizerProfileDetails> = _profileDetails

    var selectedTabIndex by mutableStateOf(0) // 0 for About, 1 for Event
        private set

    val tabs = listOf("ABOUT", "EVENT")

    // init {
    //     loadOrganizerProfile() // Load actual data, e.g., from a repository
    // }

    // private fun loadOrganizerProfile() {
    //     // viewModelScope.launch {
    //     //     _profileDetails.value = repository.getOrganizerProfile(organizerId)
    //     // }
    // }

    fun onBackNavigationClick() {
        // TODO: Implement back navigation
        println("Back navigation clicked")
    }

    fun onMoreOptionsClick() {
        // TODO: Implement more options functionality
        println("More options clicked")
    }

    fun onFollowClick() {
        // TODO: Implement follow logic
        println("Follow clicked for ${profileDetails.value.userName}")
    }

    fun onMessagesClick() {
        // TODO: Implement messages logic
        println("Messages clicked for ${profileDetails.value.userName}")
    }

    fun onTabSelected(index: Int) {
        selectedTabIndex = index
    }
}
