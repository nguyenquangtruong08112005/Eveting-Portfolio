package com.tdtuer.eventing.ui.screens.editevent

import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// A data class to hold all the state for the UI
data class EditEventUiState(
    val eventName: String = "",
    val eventType: String = "",
    val eventDate: String = "",
    val eventDescription: String = "",
    val coverImage: Int? = null,
    val thumbnailImages: List<Int> = emptyList(),
    val isEventTypeDropdownExpanded: Boolean = false
)

class EditEventViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(EditEventUiState())
    val uiState = _uiState.asStateFlow()

    val eventTypes = listOf("Music", "Conference", "Workshop", "Exhibition", "Festival")

    init {
        loadExistingEventData()
    }

    private fun loadExistingEventData() {
        // In a real app, this data would come from a repository/API
        _uiState.value = EditEventUiState(
            eventName = "International Band Music Concert",
            eventType = "Music",
            eventDate = "10AM - 06 PM, 12 November 2022",
            eventDescription = "Venenatis in lorem faucibus lobortis at. East odio varius nisi congue aliquam nunc est sit pull convallis magna.",
            coverImage = R.drawable.group_34057, // Replace
            thumbnailImages = listOf(R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp), // Replace
            isEventTypeDropdownExpanded = false
        )
    }

    // --- Event Handlers ---
    fun onBackClick() { println("Back button clicked") }

    fun onEventNameChange(newName: String) {
        _uiState.update { it.copy(eventName = newName) }
    }

    fun onEventTypeChange(newType: String) {
        _uiState.update { it.copy(eventType = newType, isEventTypeDropdownExpanded = false) }
    }

    fun onEventTypeDropdownClick() {
        _uiState.update { it.copy(isEventTypeDropdownExpanded = !it.isEventTypeDropdownExpanded) }
    }

    fun onEventTypeDropdownDismiss() {
        _uiState.update { it.copy(isEventTypeDropdownExpanded = false) }
    }

    fun onDateClick() { println("Date field clicked. Show Date Picker.") }

    fun onDescriptionChange(newDescription: String) {
        _uiState.update { it.copy(eventDescription = newDescription) }
    }

    fun onSaveChangesClick() {
        println("Saving Changes... \n${uiState.value}")
    }
}