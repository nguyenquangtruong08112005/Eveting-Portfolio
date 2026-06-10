package com.tdtuer.eventing_organizer.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.data.network.model.DashboardStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.MyEventDto
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SignOutUseCase // Nhớ import UseCase
import com.tdtuer.eventing_organizer.domain.usecase.organizer.GetDashboardStatsUseCase
import com.tdtuer.eventing_organizer.domain.usecase.organizer.GetMyEventsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isLoadingMore: Boolean = false,
    val stats: DashboardStatsResponse? = null,
    val myEvents: List<MyEventDto> = emptyList(),
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class OrganizerDashboardViewModel @Inject constructor(
    private val getDashboardStatsUseCase: GetDashboardStatsUseCase,
    private val getMyEventsUseCase: GetMyEventsUseCase,
    private val signOutUseCase: SignOutUseCase, // Inject thêm SignOutUseCase
    private val eventRepository: EventRepository
) : ViewModel() {

    // ... (Phần code cũ giữ nguyên) ...
    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState = _uiState.asStateFlow()

    private var currentPage = 1
    private val pageSize = 20
    private var isLastPage = false

    init {
        loadData(isInitial = true)
    }

    fun loadData(isInitial: Boolean = false, isRefresh: Boolean = false, isLoadMore: Boolean = false) {
        if (isLoadMore && (isLastPage || _uiState.value.isLoadingMore)) return

        viewModelScope.launch {
            if (isInitial) _uiState.update { it.copy(isLoading = true, error = null) }
            if (isRefresh) {
                _uiState.update { it.copy(isRefreshing = true, error = null) }
                currentPage = 1
                isLastPage = false
            }
            if (isLoadMore) _uiState.update { it.copy(isLoadingMore = true, error = null) }

            if (isRefresh || isInitial) {
                loadStats()
            }

            getMyEventsUseCase(page = currentPage, limit = pageSize).collectLatest { result ->
                when (result) {
                    is Result.Success -> {
                        val newEvents = result.data
                        if (newEvents.size < pageSize) {
                            isLastPage = true
                        }
                        _uiState.update { state ->
                            val updatedList = if (isRefresh || isInitial) newEvents else state.myEvents + newEvents
                            state.copy(
                                myEvents = updatedList,
                                isLoading = false,
                                isRefreshing = false,
                                isLoadingMore = false
                            )
                        }
                        if (newEvents.isNotEmpty()) currentPage++
                    }
                    is Result.Failure -> {
                        _uiState.update {
                            it.copy(isLoading = false, isRefreshing = false, isLoadingMore = false, error = result.exception.message)
                        }
                    }
                    is Result.Loading -> { }
                }
            }
        }
    }

    private suspend fun loadStats() {
        getDashboardStatsUseCase().collectLatest { result ->
            if (result is Result.Success) {
                _uiState.update { it.copy(stats = result.data) }
            }
        }
    }

    fun onRefresh() { loadData(isRefresh = true) }
    fun onLoadMore() { loadData(isLoadMore = true) }

    // --- HÀM MỚI: Đăng xuất ---
    fun onSignOut(onSuccess: () -> Unit) {
        viewModelScope.launch {
            signOutUseCase()
            onSuccess()
        }
    }

    fun cancelEvent(eventId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, successMessage = null) }
            val result = eventRepository.cancelEvent(eventId)
            when (result) {
                is Result.Success -> {
                    _uiState.update { it.copy(isLoading = false, successMessage = "Hủy sự kiện thành công") }
                    loadData(isRefresh = true)
                }
                is Result.Failure -> {
                    _uiState.update { it.copy(isLoading = false, error = result.exception.message ?: "Có lỗi xảy ra khi hủy sự kiện") }
                }
                else -> {}
            }
        }
    }

    fun clearMessage() {
        _uiState.update { it.copy(successMessage = null, error = null) }
    }
}