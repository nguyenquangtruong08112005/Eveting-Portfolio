package com.tdtuer.eventing.ui.screens.events

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.events.GetEventByIdUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

// 1. Định nghĩa UI State mới để quản lý các trạng thái
data class EventDetailsUiState(
    val isLoading: Boolean = true,
    val event: Event? = null,
    val error: String? = null
)

@HiltViewModel
class EventDetailsViewModel @Inject constructor(
    private val getEventByIdUseCase: GetEventByIdUseCase, // Tiêm UseCase
    savedStateHandle: SavedStateHandle // Tiêm SavedStateHandle
) : ViewModel() {

    // 2. Sử dụng StateFlow cho UI State
    private val _uiState = MutableStateFlow(EventDetailsUiState())
    val uiState: StateFlow<EventDetailsUiState> = _uiState.asStateFlow()

    init {
        // 3. Lấy eventId từ navigation arguments
        val eventId: String? = savedStateHandle.get("eventId")
        if (eventId != null) {
            loadEventDetails(eventId)
        } else {
            _uiState.value = EventDetailsUiState(
                isLoading = false,
                error = "Không tìm thấy ID của sự kiện."
            )
        }
    }

    // 4. Hàm gọi UseCase để lấy dữ liệu thật
    private fun loadEventDetails(eventId: String) {
        viewModelScope.launch {
            getEventByIdUseCase(eventId).collectLatest { result ->
                when (result) {
                    is Result.Loading -> {
                        _uiState.value = EventDetailsUiState(isLoading = true)
                    }
                    is Result.Success -> {
                        _uiState.value = EventDetailsUiState(
                            isLoading = false,
                            event = result.data // <-- Dữ liệu thật từ API
                        )
                    }
                    is Result.Failure -> {
                        _uiState.value = EventDetailsUiState(
                            isLoading = false,
                            error = result.exception.message ?: "Đã xảy ra lỗi không xác định"
                        )
                    }
                }
            }
        }
    }

    // --- Các trình xử lý sự kiện (Event Handlers) giữ nguyên ---

    fun onBackNavigationClick() {
        // TODO: Implement back navigation logic (thường là navController.popBackStack())
        println("Back navigation clicked")
    }

    fun onBookmarkClick() {
        // TODO: Implement bookmark toggle logic
        println("Bookmark clicked")
    }

    fun onInviteClick() {
        // TODO: Implement invite logic
        println("Invite clicked")
    }

    fun onFollowOrganizerClick() {
        // TODO: Implement follow/unfollow organizer logic
        println("Follow organizer clicked")
    }

    fun onBuyTicketClick() {
        // TODO: Implement buy ticket logic
        val price = uiState.value.event?.minPrice ?: 0.0
        println("Buy Ticket clicked for price: $price")
    }
}