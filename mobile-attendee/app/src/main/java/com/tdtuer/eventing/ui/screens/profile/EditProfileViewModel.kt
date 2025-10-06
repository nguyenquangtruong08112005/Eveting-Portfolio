package com.tdtuer.eventing.ui.screens.editprofile

import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// Data class to hold the entire state for the Edit Profile screen
data class EditProfileUiState(
    val avatar: Int? = null,
    val fullName: String = "",
    val dateOfBirth: String = "",
    val location: String = "",
    val interestedEvents: String = ""
)

class EditProfileViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(EditProfileUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadUserProfile()
    }

    private fun loadUserProfile() {
        // In a real app, this data would come from a repository or database
        _uiState.value = EditProfileUiState(
            avatar = R.drawable.default_pfp, // Replace with your drawable
            fullName = "MD Rafi Islam",
            dateOfBirth = "18 February, 2001",
            location = "Uttara, Dhaka, Bangladesh",
            interestedEvents = "Design; Art; Sports; Programing; Food; Music"
        )
    }

    // --- Event Handlers ---
    fun onBackClick() {
        println("Back button clicked")
    }

    fun onAvatarEditClick() {
        // This would typically launch an image picker
        println("Avatar edit clicked")
    }

    fun onFullNameChange(newName: String) {
        _uiState.update { it.copy(fullName = newName) }
    }

    fun onDateOfBirthClick() {
        // This would launch a DatePickerDialog
        println("Date of Birth field clicked")
    }

    fun onLocationChange(newLocation: String) {
        _uiState.update { it.copy(location = newLocation) }
    }

    fun onInterestedEventsClick() {
        // This would launch a multi-select dialog or a new screen
        println("Interested Events field clicked")
    }

    fun onSaveChangesClick() {
        // Here you would add validation and save the data
        println("Saving Profile Changes... \n${uiState.value}")
    }
}