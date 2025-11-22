package com.tdtuer.eventing.ui.screens.notifications

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class NotificationPermissionUiState(
    val showDialog: Boolean = true
)

class NotificationPermissionViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationPermissionUiState())
    val uiState = _uiState.asStateFlow()

    fun onAllowClick() {
        hideDialog()
    }

    fun onDismissClick() {
        hideDialog()
    }

    private fun hideDialog() {
        _uiState.update { it.copy(showDialog = false) }
    }

    fun showDialog() {
        _uiState.update { it.copy(showDialog = true) }
    }
}