package com.tdtuer.eventing_organizer.ui.screens.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.data.network.model.MyEventDto
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SignOutUseCase // <-- IMPORT
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AdminUiState(
    val isLoading: Boolean = false,
    val pendingEvents: List<MyEventDto> = emptyList(),
    val message: String? = null,
    val error: String? = null,
    val isLoggedOut: Boolean = false // <-- THÊM TRẠNG THÁI NÀY
)

@HiltViewModel
class AdminViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val signOutUseCase: SignOutUseCase // <-- INJECT
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadPendingEvents()
    }

    fun loadPendingEvents() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            eventRepository.getPendingEvents().collectLatest { result ->
                when (result) {
                    is Result.Success -> _uiState.update { it.copy(isLoading = false, pendingEvents = result.data) }
                    is Result.Failure -> _uiState.update { it.copy(isLoading = false, error = result.exception.message) }
                    else -> {}
                }
            }
        }
    }

    fun approveEvent(eventId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val result = eventRepository.approveEvent(eventId)
            handleActionResult(result, "Đã duyệt sự kiện!")
        }
    }

    fun rejectEvent(eventId: String, reason: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val result = eventRepository.rejectEvent(eventId, reason)
            handleActionResult(result, "Đã từ chối sự kiện.")
        }
    }

    private fun handleActionResult(result: Result<Unit>, successMsg: String) {
        if (result is Result.Success) {
            _uiState.update { it.copy(message = successMsg) }
            loadPendingEvents()
        } else if (result is Result.Failure) {
            _uiState.update { it.copy(isLoading = false, error = result.exception.message) }
        }
    }

    // --- HÀM ĐĂNG XUẤT MỚI ---
    fun onSignOut() {
        viewModelScope.launch {
            signOutUseCase() // Gọi usecase xóa token/firebase auth
            _uiState.update { it.copy(isLoggedOut = true) } // Báo hiệu cho UI
        }
    }

    fun clearMessage() {
        _uiState.update { it.copy(message = null, error = null) }
    }
}