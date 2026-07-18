package com.tdtuer.eventing_organizer.ui.screens.stats

import com.tdtuer.eventing_organizer.helpers.UserFacingErrors
import com.tdtuer.eventing_organizer.helpers.toUserMessage

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.data.network.model.EventStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.TimeSeriesData
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StatsUiState(
    val isLoading: Boolean = false,
    val stats: EventStatsResponse? = null,
    val error: String? = null,
    val chartData: List<TimeSeriesData> = emptyList()
)

@HiltViewModel
class EventStatsViewModel @Inject constructor(
    private val repository: EventRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val eventId: String = savedStateHandle["eventId"] ?: ""

    private val _uiState = MutableStateFlow(StatsUiState())
    val uiState = _uiState.asStateFlow()

    init {
        if (eventId.isNotEmpty()) {
            loadStats()
        }
    }

    fun loadStats() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.getEventStats(eventId).collectLatest { result ->
                when (result) {
                    is Result.Success -> {
                        val stats = result.data

                        // --- LOGIC XỬ LÝ DỮ LIỆU ---
                        // 1. Thử lấy từ salesOverTime (nếu server trả về list)
                        var chartDataList = stats.salesOverTime ?: emptyList()

                        // 2. Nếu list rỗng, thử chuyển đổi từ dailySales (Map<String, Int>)
                        if (chartDataList.isEmpty() && !stats.dailySales.isNullOrEmpty()) {
                            try {
                                chartDataList = stats.dailySales.map { (timestampStr, count) ->
                                    TimeSeriesData(
                                        timestamp = timestampStr.toLongOrNull() ?: 0L,
                                        value = count
                                    )
                                }.sortedBy { it.timestamp } // Sắp xếp theo ngày tăng dần
                            } catch (e: Exception) {
                                Log.e("EventStatsViewModel", "Error parsing dailySales: ${e.message}")
                            }
                        }

                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                stats = stats,
                                chartData = chartDataList
                            )
                        }
                    }
                    is Result.Failure -> {
                        _uiState.update { it.copy(isLoading = false, error = UserFacingErrors.toUserMessage(result.exception)) }
                    }
                    is Result.Loading -> {
                        _uiState.update { it.copy(isLoading = true) }
                    }
                }
            }
        }
    }
}