package com.tdtuer.eventing.ui.screens.locationpermission

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class LocationPermissionUiState(
    val showDialog: Boolean = true // Default to true for demonstration
)

class LocationPermissionViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(LocationPermissionUiState())
    val uiState = _uiState.asStateFlow()

    fun onTurnOnClick() {
        // In a real app, this would trigger the system's location permission request.
        println("Turn On clicked. Requesting location permission...")
        hideDialog()
    }

    fun onNoThanksClick() {
        println("No Thanks clicked. Dismissing dialog.")
        hideDialog()
    }

    private fun hideDialog() {
        _uiState.update { it.copy(showDialog = false) }
    }

    fun showDialog() {
        _uiState.update { it.copy(showDialog = true) }
    }
}