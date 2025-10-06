package com.tdtuer.eventing.ui.screens.addevent

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class AddEventViewModel : ViewModel() {

    // Form Fields State
    private val _eventName = MutableStateFlow("")
    val eventName: StateFlow<String> = _eventName.asStateFlow()

    private val _eventType = MutableStateFlow("")
    val eventType: StateFlow<String> = _eventType.asStateFlow()

    private val _eventDate = MutableStateFlow("")
    val eventDate: StateFlow<String> = _eventDate.asStateFlow()

    private val _eventDescription = MutableStateFlow("")
    val eventDescription: StateFlow<String> = _eventDescription.asStateFlow()

    // Dropdown Menu State
    private val _isEventTypeDropdownExpanded = MutableStateFlow(false)
    val isEventTypeDropdownExpanded: StateFlow<Boolean> = _isEventTypeDropdownExpanded.asStateFlow()

    val eventTypes = listOf("Concert", "Conference", "Workshop", "Exhibition", "Festival")

    // --- Event Handlers ---
    fun onBackClick() {
        println("Back button clicked")
    }

    fun onEventNameChange(newName: String) {
        _eventName.value = newName
    }

    fun onEventTypeChange(newType: String) {
        _eventType.value = newType
        _isEventTypeDropdownExpanded.value = false // Close dropdown after selection
    }

    fun onEventTypeDropdownClick() {
        _isEventTypeDropdownExpanded.update { !it }
    }

    fun onEventTypeDropdownDismiss() {
        _isEventTypeDropdownExpanded.value = false
    }

    fun onDateClick() {
        // In a real app, this would show a DatePickerDialog
        println("Date field clicked. Show Date Picker.")
        _eventDate.value = "2025-10-28" // Placeholder date
    }

    fun onDescriptionChange(newDescription: String) {
        _eventDescription.value = newDescription
    }

    fun onPublishNowClick() {
        // Here you would add validation and submission logic
        println("Publishing Event...")
        println("Name: ${eventName.value}")
        println("Type: ${eventType.value}")
        println("Date: ${eventDate.value}")
        println("Description: ${eventDescription.value}")
    }
}