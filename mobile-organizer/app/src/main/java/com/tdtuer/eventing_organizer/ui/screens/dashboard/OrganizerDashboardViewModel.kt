package com.tdtuer.eventing_organizer.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.data.network.model.DashboardStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.MyEventDto
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.usecase.organizer.GetDashboardStatsUseCase // <-- Import mới
import com.tdtuer.eventing_organizer.domain.usecase.organizer.GetMyEventsUseCase // <-- Import mới
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardUiState(
    val isLoading: Boolean = false,
    val stats: DashboardStatsResponse? = null,
    val myEvents: List<MyEventDto> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class OrganizerDashboardViewModel @Inject constructor(
    private val getDashboardStatsUseCase: GetDashboardStatsUseCase, // <-- Thay Repository bằng UseCase
    private val getMyEventsUseCase: GetMyEventsUseCase // <-- Thay Repository bằng UseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadDashboardData()
    }

    fun loadDashboardData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // 1. Lấy thống kê thông qua UseCase
            launch {
                getDashboardStatsUseCase().collectLatest { result ->
                    when (result) {
                        is Result.Success -> {
                            _uiState.update { it.copy(stats = result.data) }
                        }
                        is Result.Failure -> {
                            // Chỉ log lỗi hoặc hiện thông báo nhỏ
                            println("Stats Error: ${result.exception.message}")
                        }
                        else -> {}
                    }
                }
            }

            // 2. Lấy danh sách sự kiện thông qua UseCase
            launch {
                getMyEventsUseCase().collectLatest { result ->
                    when (result) {
                        is Result.Success -> {
                            _uiState.update { it.copy(myEvents = result.data, isLoading = false) }
                        }
                        is Result.Failure -> {
                            _uiState.update {
                                it.copy(isLoading = false, error = result.exception.message)
                            }
                        }
                        is Result.Loading -> {
                            // Loading đã set ở trên
                        }
                    }
                }
            }
        }
    }
}