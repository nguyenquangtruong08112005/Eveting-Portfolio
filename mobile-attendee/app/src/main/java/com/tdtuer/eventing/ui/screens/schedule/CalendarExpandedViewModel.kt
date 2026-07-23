package com.tdtuer.eventing.ui.screens.calendarexpanded

import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.screens.calendar.Event
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.time.LocalDate

data class CalendarExpandedUiState(
    val allEvents: List<Event> = emptyList(),
    val selectedDate: LocalDate = LocalDate.now(),
    val eventsForSelectedDate: List<Event> = emptyList()
)

class CalendarExpandedViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(CalendarExpandedUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadEvents()
    }

    private fun loadEvents() {
        val allEvents = listOf(
            Event("1", "Designers Meetup 2022", LocalDate.of(2022, 10, 3), "Gulshan, Dhaka", R.drawable.banner_svgrepo_com),
            Event("2", "Dribbblers Meetup 2022", LocalDate.of(2022, 10, 7), "Banani, Dhaka", R.drawable.banner_svgrepo_com),
            Event("3", "Food Competition Event", LocalDate.of(2022, 10, 10), "Mirpur, Dhaka", R.drawable.banner_svgrepo_com),
            Event("4", "Basketball Final Match", LocalDate.of(2022, 10, 10), "Uttara, Dhaka", R.drawable.banner_svgrepo_com),
            Event("5", "ARB Stunt Riders Event", LocalDate.of(2022, 10, 22), "Banani, Dhaka", R.drawable.banner_svgrepo_com)
        )

        // Set initial state
        val initialSelectedDate = LocalDate.of(2022, 10, 10)
        _uiState.value = CalendarExpandedUiState(
            allEvents = allEvents,
            selectedDate = initialSelectedDate,
            eventsForSelectedDate = allEvents.filter { it.date == initialSelectedDate }
        )
    }

    fun onDateSelected(date: LocalDate) {
        _uiState.update { currentState ->
            currentState.copy(
                selectedDate = date,
                // Filter the list of events based on the new date
                eventsForSelectedDate = currentState.allEvents.filter { it.date == date }
            )
        }
    }

    fun onBackClick() {
        println("Back clicked")
    }

    fun onMoreOptionsClick() {
        println("More options clicked")
    }
}