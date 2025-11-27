package com.tdtuer.eventing_organizer.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.data.network.model.DashboardStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.MyEventDto
import com.tdtuer.eventing_organizer.domain.model.Result
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
    val isLoading: Boolean = false,      // Loading lần đầu
    val isRefreshing: Boolean = false,   // Loading khi kéo từ trên xuống
    val isLoadingMore: Boolean = false,  // Loading khi cuộn xuống dưới
    val stats: DashboardStatsResponse? = null,
    val myEvents: List<MyEventDto> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class OrganizerDashboardViewModel @Inject constructor(
    private val getDashboardStatsUseCase: GetDashboardStatsUseCase,
    private val getMyEventsUseCase: GetMyEventsUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState = _uiState.asStateFlow()

    // Quản lý phân trang
    private var currentPage = 1
    private val pageSize = 20
    private var isLastPage = false

    init {
        loadData(isInitial = true)
    }

    /**
     * Hàm tổng quát để load dữ liệu
     */
    fun loadData(isInitial: Boolean = false, isRefresh: Boolean = false, isLoadMore: Boolean = false) {
        // Chặn load more nếu đang load hoặc đã hết dữ liệu
        if (isLoadMore && (isLastPage || _uiState.value.isLoadingMore)) return

        viewModelScope.launch {
            // 1. Cập nhật trạng thái UI
            if (isInitial) _uiState.update { it.copy(isLoading = true, error = null) }
            if (isRefresh) {
                _uiState.update { it.copy(isRefreshing = true, error = null) }
                currentPage = 1
                isLastPage = false
            }
            if (isLoadMore) _uiState.update { it.copy(isLoadingMore = true, error = null) }

            // 2. Nếu là refresh hoặc init -> Load lại Stats
            if (isRefresh || isInitial) {
                loadStats()
            }

            // 3. Load Events (Phân trang)
            getMyEventsUseCase(page = currentPage, limit = pageSize).collectLatest { result ->
                when (result) {
                    is Result.Success -> {
                        val newEvents = result.data

                        // Kiểm tra xem đã hết dữ liệu chưa
                        if (newEvents.size < pageSize) {
                            isLastPage = true
                        }

                        _uiState.update { state ->
                            // Nếu là refresh hoặc init -> Thay thế list cũ
                            // Nếu là load more -> Nối thêm vào list cũ
                            val updatedList = if (isRefresh || isInitial) {
                                newEvents
                            } else {
                                state.myEvents + newEvents
                            }

                            state.copy(
                                myEvents = updatedList,
                                isLoading = false,
                                isRefreshing = false,
                                isLoadingMore = false
                            )
                        }

                        // Tăng page nếu load thành công
                        if (newEvents.isNotEmpty()) {
                            currentPage++
                        }
                    }
                    is Result.Failure -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isRefreshing = false,
                                isLoadingMore = false,
                                error = result.exception.message
                            )
                        }
                    }
                    is Result.Loading -> { /* Đã handle bằng state riêng */ }
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

    // Sự kiện từ UI gọi
    fun onRefresh() {
        loadData(isRefresh = true)
    }

    fun onLoadMore() {
        loadData(isLoadMore = true)
    }
}