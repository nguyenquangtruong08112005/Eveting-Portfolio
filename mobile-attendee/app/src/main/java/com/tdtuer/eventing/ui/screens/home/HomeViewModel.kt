package com.tdtuer.eventing.ui.screens.home

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Sports
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.tdtuer.eventing.R
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// Data classes for UI state
data class Event(val id: String, val title: String, val imageRes: Int, val date: String, val month: String, val avatars: List<Int>, val goingCount: Int, val location: String)
data class Category(val name: String, val color: Color, val selectedTextColor: Color, val iconFactory: @Composable () -> Unit)

// Enum for Navigation Events
enum class HomeNavEvent {
    NavigateToAuth
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val firebaseAuth: FirebaseAuth // Inject FirebaseAuth
) : ViewModel() {

    // --- Navigation ---
    private val _navEvent = MutableSharedFlow<HomeNavEvent>()
    val navEvent = _navEvent.asSharedFlow()

    // --- UI State ---
    private val _upcomingEvents = mutableStateOf<List<Event>>(emptyList())
    val upcomingEvents: State<List<Event>> = _upcomingEvents

    private val _nearbyEvents = mutableStateOf<List<Event>>(emptyList())
    val nearbyEvents: State<List<Event>> = _nearbyEvents

    private val _categories = mutableStateOf<List<Category>>(emptyList())
    val categories: State<List<Category>> = _categories

    private val _selectedCategoryName = mutableStateOf("All")
    val selectedCategoryName: String get() = _selectedCategoryName.value

    init {
        loadUpcomingEvents()
        loadNearbyEvents()
        loadCategories()
    }

    // --- Event Handlers ---
    fun onSignOutClick() = viewModelScope.launch {
        firebaseAuth.signOut()
        _navEvent.emit(HomeNavEvent.NavigateToAuth) // Phát sự kiện điều hướng
    }

    fun onBottomBarItemClick(itemName: String) { /* TODO */ }
    fun onFabClick() { /* TODO */ }
    fun onHomeHeaderNotificationsClick() { /* TODO */ }
    fun onSearchFilterClick() { /* TODO */ }
    fun onCategorySelected(categoryName: String) {
        _selectedCategoryName.value = categoryName
    }
    fun onSeeAllClick(sectionTitle: String) { /* TODO */ }
    fun onEventBookmarkClick(event: Event) { /* TODO */ }
    fun onInviteFriendsClick() { /* TODO */ }

    // --- Data Loading ---
    private fun loadUpcomingEvents() {
        _upcomingEvents.value = listOf(
            Event("1", "International Band Music Concert", R.drawable.ic_launcher_background, "14", "DEC", listOf(R.drawable.ic_launcher_background, R.drawable.ic_launcher_background, R.drawable.ic_launcher_background), 20, "New York, USA"),
            Event("2", "Classical Music Festival", R.drawable.ic_launcher_background, "21", "DEC", listOf(R.drawable.ic_launcher_background, R.drawable.ic_launcher_background), 15, "Los Angeles, CA")
        )
    }

    private fun loadNearbyEvents() {
        _nearbyEvents.value = listOf(
            Event("3", "Indie Rock Night", R.drawable.ic_launcher_background, "28", "DEC", listOf(R.drawable.ic_launcher_background), 10, "Chicago, IL"),
            Event("4", "Jazz & Blues Weekend", R.drawable.ic_launcher_background, "04", "JAN", listOf(R.drawable.ic_launcher_background, R.drawable.ic_launcher_background), 25, "New Orleans, LA")
        )
    }

    private fun loadCategories() {
        _categories.value = listOf(
            Category("All", Color(0xFF5669FF), Color.White) { androidx.compose.material3.Icon(Icons.Default.Bookmark, contentDescription = null, tint = Color.White) },
            Category("Music", Color.White, Color.Black) { androidx.compose.material3.Icon(Icons.Default.MusicNote, contentDescription = null, tint = Color.Black) },
            Category("Sports", Color(0xFFF0635A), Color.White) { androidx.compose.material3.Icon(Icons.Default.Sports, contentDescription = null, tint = Color.White) },
            Category("Art", Color(0xFF29D697), Color.White) { androidx.compose.material3.Icon(Icons.Default.Campaign, contentDescription = null, tint = Color.White) }
        )
    }
}