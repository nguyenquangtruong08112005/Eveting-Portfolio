package com.tdtuer.eventing.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.FilterParams
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.events.SearchEventsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class GlobalSearchState(
    val searchQuery: String = "",
    val activeFilters: FilterParams = FilterParams(),
    val searchResults: Result<List<Event>> = Result.Success(emptyList())
)

@HiltViewModel
class SharedSearchViewModel @Inject constructor(
    private val searchEventsUseCase: SearchEventsUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(GlobalSearchState())
    val uiState: StateFlow<GlobalSearchState> = _uiState.asStateFlow()

    /**
     * Được gọi bởi thanh tìm kiếm (search bar) trên HomeScreen khi người dùng gõ.
     */
    fun onSearchQueryChanged(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    /**
     * [REFACTORED] Được gọi khi người dùng nhấn "Enter" (Search) trên bàn phím ở màn hình HOME.
     * Logic mới: Khi search từ Home, ta coi đây là một tìm kiếm mới -> Reset các filter cũ (category, price...)
     * để tránh việc user không tìm thấy gì do dính filter cũ.
     */
    fun onHomeSearchTriggered() {
        val currentQuery = _uiState.value.searchQuery.trim()

        // Tạo bộ lọc mới tinh, chỉ giữ lại query
        val newFilters = FilterParams(
            query = currentQuery.ifBlank { null }
        )

        _uiState.update {
            it.copy(
                activeFilters = newFilters,
                // Giữ nguyên searchQuery trên UI
                searchQuery = currentQuery
            )
        }
        fetchFilteredEvents()
    }

    /**
     * Được gọi khi người dùng nhấn "Apply" từ Filter Bottom Sheet.
     */
    fun applyFilters(newFilters: FilterParams) {
        // Cập nhật cả query trong state để đồng bộ với filter vừa apply
        val updatedQuery = newFilters.query ?: ""

        _uiState.update {
            it.copy(
                searchQuery = updatedQuery,
                activeFilters = newFilters
            )
        }
        fetchFilteredEvents()
    }

    /**
     * Xóa tất cả tìm kiếm và bộ lọc, quay lại trạng thái ban đầu.
     */
    fun clearSearchAndFilters() {
        _uiState.update {
            it.copy(
                searchQuery = "",
                activeFilters = FilterParams(),
                searchResults = Result.Success(emptyList())
            )
        }
    }

    /**
     * Gọi UseCase để tìm kiếm dựa trên `activeFilters` hiện tại.
     */
    private fun fetchFilteredEvents() {
        viewModelScope.launch {
            _uiState.update { it.copy(searchResults = Result.Loading) }

            searchEventsUseCase(_uiState.value.activeFilters).collect { result ->
                _uiState.update { it.copy(searchResults = result) }
            }
        }
    }
}