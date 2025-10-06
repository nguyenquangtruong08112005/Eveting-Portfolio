package com.tdtuer.eventing.ui.screens.home

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fastfood
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.SportsBasketball
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R

// --- Data Models ---
data class Event(
    val id: String, // Added ID for uniqueness
    val title: String,
    val location: String,
    val goingCount: Int,
    val date: String,
    val month: String,
    val imageRes: Int,
    val avatars: List<Int>
)

data class Category(
    val name: String,
    val iconFactory: @Composable () -> Unit,
    val color: Color,
    val selectedTextColor: Color = Color.White
)

// FIX: Added the missing data class definition here
data class EventProgram(
    val title: String,
    val time: String
)


class HomeViewModel : ViewModel() {

    private val _upcomingEvents = mutableStateOf<List<Event>>(emptyList())
    val upcomingEvents: State<List<Event>> = _upcomingEvents

    val nearbyEvents: State<List<Event>> = _upcomingEvents

    private val _categories = mutableStateOf<List<Category>>(emptyList())
    val categories: State<List<Category>> = _categories

    var selectedCategoryName by mutableStateOf("Music")
        private set

    // --- State for the Rating Modal ---
    private val _showRatingModal = mutableStateOf(false)
    val showRatingModal: State<Boolean> = _showRatingModal

    private val _eventToRate = mutableStateOf<Event?>(null)
    val eventToRate: State<Event?> = _eventToRate

    private val _currentRating = mutableStateOf(0)
    val currentRating: State<Int> = _currentRating

    init {
        loadUpcomingEvents()
        loadCategories()
        triggerRatingModal() // Trigger the modal for demonstration
    }

    // --- Functions to control the Rating Modal ---
    private fun triggerRatingModal() {
        _eventToRate.value = _upcomingEvents.value.firstOrNull()
        _showRatingModal.value = true
        _currentRating.value = 4
    }

    fun onDismissRatingModal() {
        _showRatingModal.value = false
        _currentRating.value = 0
    }

    fun onRatingChanged(newRating: Int) {
        _currentRating.value = newRating
    }

    fun onSubmitRating() {
        if (currentRating.value > 0) {
            println("Submitting rating of ${currentRating.value} stars for event: ${eventToRate.value?.title}")
            onDismissRatingModal()
        }
    }

    private fun loadUpcomingEvents() {
        _upcomingEvents.value = listOf(
            Event("1", "International Band Music...", "36 Guild Street London, UK", 20, "10", "JUNE", R.drawable.banner_svgrepo_com, listOf(R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp)),
            Event("2", "Jo Malone London's...", "Radius Gallery, Santa Cruz", 20, "10", "JUNE", R.drawable.banner_svgrepo_com, listOf(R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp))
        )
    }

    private fun loadCategories() {
        _categories.value = listOf(
            Category("Sports", { Icon(Icons.Default.SportsBasketball, "Sports") }, Color(0xFFF0635A)),
            Category("Music", { Icon(Icons.Default.MusicNote, "Music") }, Color.White, Color.Black),
            Category("Food", { Icon(Icons.Default.Fastfood, "Food") }, Color(0xFF29D697)),
            Category("Art", { Icon(Icons.Default.Palette, "Art") }, Color(0xFFF59762))
        )
    }

    // --- Existing Event Handlers ---
    fun onCategorySelected(categoryName: String) { selectedCategoryName = categoryName }
    fun onSearchFilterClick() { println("Search filter clicked") }
    fun onSeeAllClick(sectionTitle: String) { println("See All clicked for section: $sectionTitle") }
    fun onEventBookmarkClick(event: Event) { println("Bookmark clicked for event: ${event.title}") }
    fun onInviteFriendsClick() { println("Invite friends clicked") }
    fun onFabClick() { println("FAB clicked") }
    fun onBottomBarItemClick(itemName: String) { println("Bottom bar item clicked: $itemName") }
    fun onHomeHeaderMenuClick(){ println("Menu clicked") }
    fun onHomeHeaderNotificationsClick(){ println("Notifications clicked") }
}