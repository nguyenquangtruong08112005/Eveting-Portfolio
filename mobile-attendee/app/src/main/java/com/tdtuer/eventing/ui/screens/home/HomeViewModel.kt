package com.tdtuer.eventing.ui.screens.home

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fastfood
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.SportsBasketball
import androidx.compose.material3.Icon // Import Icon composable
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R // Ensure R class is correctly imported

// --- Data Models ---
data class Event(
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
    val color: Color, // Background color of the chip when selected
    val selectedTextColor: Color = Color.White // Text color when the chip is selected
)

class HomeViewModel : ViewModel() {

    private val _upcomingEvents = mutableStateOf<List<Event>>(emptyList())
    val upcomingEvents: State<List<Event>> = _upcomingEvents

    // Example: Can be expanded to hold different lists for different sections
    val nearbyEvents: State<List<Event>> = _upcomingEvents // Reusing for now

    private val _categories = mutableStateOf<List<Category>>(emptyList())
    val categories: State<List<Category>> = _categories

    var selectedCategoryName by mutableStateOf("Music") // Default selected category
        private set

    init {
        loadUpcomingEvents()
        loadCategories()
    }

    private fun loadUpcomingEvents() {
        _upcomingEvents.value = listOf(
            Event("International Band Mu...", "36 Guild Street London, UK", 20, "10", "JUNE", R.drawable.default_pfp, listOf(R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp)),
            Event("Jo Malone London's...", "Radius Gallery, Santa Cruz", 20, "10", "JUNE", R.drawable.default_pfp, listOf(R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp))
        )
    }

    private fun loadCategories() {
        _categories.value = listOf(
            Category(
                name = "Sports",
                iconFactory = { Icon(Icons.Default.SportsBasketball, contentDescription = "Sports Icon", tint = Color.White) }, // Icon when selected, matches selectedTextColor
                color = Color(0xFFF0635A), // Chip background when selected
                selectedTextColor = Color.White
            ),
            Category(
                name = "Music",
                iconFactory = { Icon(Icons.Default.MusicNote, contentDescription = "Music Icon", tint = Color(0xFFF59762)) }, // Original tint for selected Music icon
                color = Color.White, // Chip background when selected for Music
                selectedTextColor = Color.Black // Text color for selected Music chip
            ),
            Category(
                name = "Food",
                iconFactory = { Icon(Icons.Default.Fastfood, contentDescription = "Food Icon", tint = Color.White) }, // Icon when selected, matches selectedTextColor
                color = Color(0xFF29D697), // Chip background when selected
                selectedTextColor = Color.White
            )
        )
    }

    fun onCategorySelected(categoryName: String) {
        selectedCategoryName = categoryName
        println("Category selected: $categoryName")
    }

    fun onSearchFilterClick() {
        println("Search filter clicked")
    }

    fun onSeeAllClick(sectionTitle: String) {
        println("See All clicked for section: $sectionTitle")
    }

    fun onEventBookmarkClick(event: Event) {
        println("Bookmark clicked for event: ${event.title}")
    }

    fun onInviteFriendsClick() {
        println("Invite friends clicked")
    }

    fun onFabClick() {
        println("FAB clicked")
    }

    fun onBottomBarItemClick(itemName: String) {
        println("Bottom bar item clicked: $itemName")
    }

    fun onHomeHeaderMenuClick(){
        println("Menu clicked")
    }

    fun onHomeHeaderNotificationsClick(){
        println("Notifications clicked")
    }
}
