// eventing.zip/ui/screens/home/SharedSearchViewModel.kt (TẠO FILE MỚI)
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
     * Được gọi khi người dùng nhấn "Enter" (Search) trên bàn phím.
     * Nó sẽ lấy `searchQuery` hiện tại và coi đó là bộ lọc `query`.
     */
    fun executeSearchFromQuery() {
        val currentQuery = _uiState.value.searchQuery
        val newFilters = _uiState.value.activeFilters.copy(
            query = currentQuery.ifBlank { null }
        )
        _uiState.update { it.copy(activeFilters = newFilters) }
        fetchFilteredEvents()
    }

    /**
     * Được gọi khi người dùng nhấn "Apply" từ Filter Bottom Sheet.
     */
    fun applyFilters(newFilters: FilterParams) {
        // Ghi đè bộ lọc, nhưng giữ lại `searchQuery` nếu nó được đặt từ Bottom Sheet
        val query = newFilters.query ?: _uiState.value.searchQuery
        _uiState.update {
            it.copy(
                searchQuery = query ?: "",
                activeFilters = newFilters.copy(query = query)
            )
        }
        fetchFilteredEvents()
    }

    /**
     * Xóa tất cả tìm kiếm và bộ lọc, quay lại trạng thái ban đầu.
     */
    fun clearSearchAndFilters() {
        _uiState.value = GlobalSearchState(
            // Giữ lại kết quả cũ để tránh màn hình nhấp nháy
            searchResults = _uiState.value.searchResults
        )
        // Bạn có thể fetch lại "all events" ở đây nếu muốn
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