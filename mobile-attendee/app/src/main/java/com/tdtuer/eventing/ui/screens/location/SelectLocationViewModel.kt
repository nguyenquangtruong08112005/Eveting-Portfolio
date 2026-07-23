package com.tdtuer.eventing.ui.screens.selectlocation

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class SelectLocationUiState(
    val searchQuery: String = "",
    // In a real app, this would be a LatLng object updated by the map's camera
    val selectedLocationInfo: String = "Downey St, San Francisco, CA"
)

class SelectLocationViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(SelectLocationUiState())
    val uiState = _uiState.asStateFlow()

    fun onBackClick() {
        println("Back clicked")
    }

    fun onSearchQueryChange(newQuery: String) {
        _uiState.update { it.copy(searchQuery = newQuery) }
    }

    fun onSearchClick() {
        // This would trigger a geocoding search and move the map camera
        println("Searching for: ${uiState.value.searchQuery}")
    }

    fun onRecenterClick() {
        // This would move the map camera to the user's current location
        println("Recenter clicked")
    }

    fun onAddClick() {
        // This would confirm the selection and pass the location data back
        println("Location added: ${uiState.value.selectedLocationInfo}")
    }
}