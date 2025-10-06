package com.tdtuer.eventing.ui.screens.calendar

import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.time.LocalDate

// --- Data Models ---
data class Event(
    val id: String,
    val title: String,
    val date: LocalDate,
    val location: String,
    @DrawableRes val imageRes: Int
)

data class CalendarUiState(
    val events: Map<LocalDate, List<Event>> = emptyMap(),
    val selectedBottomNavItem: String = "Calendar"
)

class CalendarViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(CalendarUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadEvents()
    }

    private fun loadEvents() {
        // In a real app, this data would come from a repository/API.
        // Replace placeholders with your actual drawable resources.
        val events = listOf(
            Event("1", "Designers Meetup 2022", LocalDate.of(2022, 10, 3), "Gulshan, Dhaka", R.drawable.banner_svgrepo_com),
            Event("2", "Dribbblers Meetup 2022", LocalDate.of(2022, 10, 7), "Banani, Dhaka", R.drawable.banner_svgrepo_com),
            Event("3", "Food Competition Event", LocalDate.of(2022, 10, 10), "Mirpur, Dhaka", R.drawable.banner_svgrepo_com),
            Event("4", "Basketball Final Match", LocalDate.of(2022, 10, 10), "Uttara, Dhaka", R.drawable.banner_svgrepo_com),
            Event("5", "ARB Stunt Riders Event", LocalDate.of(2022, 10, 22), "Banani, Dhaka", R.drawable.banner_svgrepo_com)
        )

        // Group events by date and update the state
        _uiState.update {
            it.copy(
                events = events.sortedBy { event -> event.date }.groupBy { event -> event.date }
            )
        }
    }

    // --- Event Handlers ---
    fun onBackClick() {
        println("Back clicked")
    }

    fun onCalendarViewChangeClick() {
        println("Calendar view change clicked")
    }

    fun onMoreOptionsClick() {
        println("More options clicked")
    }

    fun onBottomNavItemClick(itemName: String) {
        _uiState.update { it.copy(selectedBottomNavItem = itemName) }
        println("$itemName tab selected")
    }
}