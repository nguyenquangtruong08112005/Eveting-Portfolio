// eventing.zip/ui/screens/eventpreview/EventPreviewViewModel.kt

package com.tdtuer.eventing.ui.screens.events

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.events.GetEventByIdUseCase
import com.tdtuer.eventing.ui.navigation.Screen
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

// 1. Định nghĩa UI State (thay thế data class cũ)
data class EventPreviewUiState(
    val isLoading: Boolean = true,
    val event: Event? = null,
    val error: String? = null
)

// 2. Nâng cấp ViewModel
@HiltViewModel
class EventPreviewViewModel @Inject constructor(
    private val getEventByIdUseCase: GetEventByIdUseCase, // Tiêm UseCase
    savedStateHandle: SavedStateHandle // Tiêm SavedStateHandle
) : ViewModel() {

    private val _uiState = MutableStateFlow(EventPreviewUiState())
    val uiState: StateFlow<EventPreviewUiState> = _uiState.asStateFlow()

    init {
        // 3. Lấy eventId từ arguments của navigation
        val eventId: String? = savedStateHandle.get("eventId")

        if (eventId != null) {
            loadEventDetails(eventId)
        } else {
            _uiState.value = EventPreviewUiState(
                isLoading = false,
                error = "Event ID not found."
            )
        }
    }

    // 4. Gọi UseCase để lấy dữ liệu thật
    private fun loadEventDetails(eventId: String) {
        viewModelScope.launch {
            getEventByIdUseCase(eventId).collectLatest { result ->
                when (result) {
                    is Result.Loading -> {
                        _uiState.value = EventPreviewUiState(isLoading = true)
                    }
                    is Result.Success -> {
                        _uiState.value = EventPreviewUiState(
                            isLoading = false,
                            event = result.data // <-- DỮ LIỆU THẬT TỪ API
                        )
                        //Log.d("EventPreviewViewModel", "loadEventDetails: ${result.data}")
                    }
                    is Result.Failure -> {
                        _uiState.value = EventPreviewUiState(
                            isLoading = false,
                            error = result.exception.message
                        )
                    }
                }
            }
        }
    }

    // --- UI Event Handlers (Giữ nguyên logic cũ) ---
    fun onBackClick(navController: NavController) {
        navController.popBackStack()
    }

    fun onFavoriteClick() {
        println("Favorite clicked")
        // TODO: Implement logic (e.g., call a AddToWishlistUseCase)
    }

    fun onContinue(navController: NavController, eventId: String) {
        println("Choose Your Seat clicked for event: $eventId")
        //Log.d("EventPreviewViewModel", "onContinue: $eventId")
        // Điều hướng đến màn hình đặt vé
        navController.navigate(Screen.EventDetails.createRoute(eventId))
    }
}