package com.tdtuer.eventing_organizer.ui.screens.admin

import com.tdtuer.eventing_organizer.helpers.UserFacingErrors
import com.tdtuer.eventing_organizer.helpers.toUserMessage

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Event
import com.tdtuer.eventing_organizer.domain.model.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AdminDetailUiState(
    val isLoading: Boolean = true,
    val event: Event? = null,
    val error: String? = null,
    val actionMessage: String? = null, // Thông báo kết quả (Toast)
    val isActionSuccess: Boolean = false // Cờ để đóng màn hình khi xong
)

@HiltViewModel
class AdminEventDetailViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val eventId: String = savedStateHandle.get<String>("eventId") ?: ""

    private val _uiState = MutableStateFlow(AdminDetailUiState())
    val uiState = _uiState.asStateFlow()

    init {
        if (eventId.isNotEmpty()) {
            loadEventDetails()
        } else {
            _uiState.update { it.copy(isLoading = false, error = "Invalid Event ID") }
        }
    }

    private fun loadEventDetails() {
        viewModelScope.launch {
            eventRepository.getEventById(eventId).collectLatest { result ->
                //Log.d("AdminEventDetailViewModel", "Event ID: $result")
                when (result) {
                    is Result.Loading -> _uiState.update { it.copy(isLoading = true) }
                    is Result.Success -> _uiState.update { it.copy(isLoading = false, event = result.data) }
                    is Result.Failure -> _uiState.update { it.copy(isLoading = false, error = UserFacingErrors.toUserMessage(result.exception)) }
                }
            }
        }
    }

    fun approveEvent() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val result = eventRepository.approveEvent(eventId)
            handleActionResult(result, "Đã duyệt sự kiện thành công!")
        }
    }

    fun rejectEvent(reason: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val result = eventRepository.rejectEvent(eventId, reason)
            handleActionResult(result, "Đã từ chối sự kiện.")
        }
    }

    private fun handleActionResult(result: Result<Unit>, successMsg: String) {
        if (result is Result.Success) {
            _uiState.update { it.copy(isLoading = false, actionMessage = successMsg, isActionSuccess = true) }
        } else if (result is Result.Failure) {
            _uiState.update { it.copy(isLoading = false, error = UserFacingErrors.toUserMessage(result.exception)) }
        }
    }

    fun clearMessage() {
        _uiState.update { it.copy(actionMessage = null, error = null) }
    }
}