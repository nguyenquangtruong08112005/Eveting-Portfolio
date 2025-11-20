package com.tdtuer.eventing.ui.screens.ticket

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.model.MyTicketUiModel
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.TicketStatus
import com.tdtuer.eventing.domain.usecase.tickets.GetUserTicketsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MyTicketViewModel @Inject constructor(
    private val getUserTicketsUseCase: GetUserTicketsUseCase
) : ViewModel() {

    // Status Tabs: 0=All, 1=Success, 2=Pending, 3=Cancelled
    private val _selectedStatusTab = MutableStateFlow(0)
    val selectedStatusTab: StateFlow<Int> = _selectedStatusTab

    // Time Tabs: 0=Upcoming, 1=Past
    private val _selectedTimeTab = MutableStateFlow(0)
    val selectedTimeTab: StateFlow<Int> = _selectedTimeTab

    private val _allTickets = MutableStateFlow<List<MyTicketUiModel>>(emptyList())

    // Loading States
    private val _isLoading = MutableStateFlow(false) // Init load
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _isRefreshing = MutableStateFlow(false) // Pull to refresh
    val isRefreshing: StateFlow<Boolean> = _isRefreshing

    private val _isLoadingMore = MutableStateFlow(false) // Load more
    val isLoadingMore: StateFlow<Boolean> = _isLoadingMore

    // Pagination
    private var currentPage = 1
    private val limit = 40
    private var isLastPage = false

    // Logic lọc kép (Status + Time)
    val displayedTickets: StateFlow<List<MyTicketUiModel>> = combine(
        _allTickets,
        _selectedStatusTab,
        _selectedTimeTab
    ) { tickets, statusIndex, timeIndex ->
        val currentTime = System.currentTimeMillis()

        // 1. Lọc theo thời gian (Upcoming / Past)
        var filtered = if (timeIndex == 0) {
            tickets.filter { it.eventTimestamp >= currentTime } // Upcoming
        } else {
            tickets.filter { it.eventTimestamp < currentTime } // Past
        }

        // 2. Lọc theo trạng thái
        filtered = when (statusIndex) {
            0 -> filtered // All
            1 -> filtered.filter { it.status == TicketStatus.PAID || it.status == TicketStatus.CHECKED_IN }
            2 -> filtered.filter { it.status == TicketStatus.PENDING }
            3 -> filtered.filter { it.status == TicketStatus.CANCELLED }
            else -> filtered
        }

        filtered.sortedBy { it.eventTimestamp } // Sort tăng dần theo ngày
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        loadTickets(isInit = true)
    }

    fun loadTickets(isInit: Boolean = false, isRefresh: Boolean = false, isLoadMore: Boolean = false) {
        if (_isLoading.value || _isRefreshing.value || _isLoadingMore.value) return
        if (isLoadMore && isLastPage) return

        viewModelScope.launch {
            if (isInit) _isLoading.value = true
            if (isRefresh) {
                _isRefreshing.value = true
                currentPage = 1
                isLastPage = false
            }
            if (isLoadMore) {
                _isLoadingMore.value = true
                currentPage++
            }

            getUserTicketsUseCase(page = currentPage, limit = limit).collect { result ->
                when (result) {
                    is Result.Success -> {
                        val newTickets = result.data
                        if (newTickets.size < limit) isLastPage = true

                        if (isRefresh || currentPage == 1) {
                            _allTickets.value = newTickets
                        } else {
                            _allTickets.value += newTickets
                        }

                        // Reset loading states
                        _isLoading.value = false
                        _isRefreshing.value = false
                        _isLoadingMore.value = false
                    }
                    is Result.Failure -> {
                        _isLoading.value = false
                        _isRefreshing.value = false
                        _isLoadingMore.value = false
                        if (isLoadMore) currentPage--
                    }
                    is Result.Loading -> { /* Handled by states */ }
                }
            }
        }
    }

    fun onStatusTabSelected(index: Int) { _selectedStatusTab.value = index }
    fun onTimeTabSelected(index: Int) { _selectedTimeTab.value = index }
    fun onRefresh() { loadTickets(isRefresh = true) }
    fun onLoadMore() { loadTickets(isLoadMore = true) }
}