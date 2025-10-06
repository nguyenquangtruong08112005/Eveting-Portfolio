package com.tdtuer.eventing.ui.screens.covid

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class CovidDeclarationUiState(
    val showSheet: Boolean = true, // Control the sheet's visibility
    val isConfirmed: Boolean = false // State for the checkbox
)

class CovidDeclarationViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(CovidDeclarationUiState())
    val uiState = _uiState.asStateFlow()

    fun onConfirmationToggled(isChecked: Boolean) {
        _uiState.update { it.copy(isConfirmed = isChecked) }
    }

    fun onContinueClick() {
        if (uiState.value.isConfirmed) {
            println("Declaration confirmed. Proceeding...")
            // Hide the sheet after continuing
            onDismissSheet()
        }
    }

    fun onDismissSheet() {
        _uiState.update { it.copy(showSheet = false) }
    }
}