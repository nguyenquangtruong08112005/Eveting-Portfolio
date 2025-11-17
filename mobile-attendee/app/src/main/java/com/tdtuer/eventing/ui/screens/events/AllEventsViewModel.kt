// eventing.zip/ui/screens/events/AllEventsViewModel.kt (ĐÃ CẬP NHẬT)
package com.tdtuer.eventing.ui.screens.events

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.events.GetAllEventsUseCase
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToHour
import com.tdtuer.eventing.helpers.formatTimestampToMinute
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import com.tdtuer.eventing.helpers.formatTimestampToYear
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

// (YÊU CẦU 4) Cập nhật Data Model để dùng imageUrl (String) thay vì imageRes (Int)
data class EventListItem(
    val title: String,
    val dateTime: String,
    val location: String,
    val imageUrl: String // <-- ĐÃ THAY ĐỔI
)

@HiltViewModel // <-- THÊM HILT
class AllEventsViewModel @Inject constructor(
    private val getAllEventsUseCase: GetAllEventsUseCase // <-- (YÊU CẦU 3) Inject UseCase
) : ViewModel() {

    private val _events = mutableStateOf<List<EventListItem>>(emptyList())
    val events: State<List<EventListItem>> = _events

    // (YÊU CẦU 3) Thêm state cho Loading và Error
    private val _isLoading = mutableStateOf(false)
    val isLoading: State<Boolean> = _isLoading

    private val _error = mutableStateOf<String?>(null)
    val error: State<String?> = _error

    init {
        loadEvents() // <-- (YÊU CẦU 3) Gọi API thật
    }

    // (YÊU CẦU 3) Hàm gọi API thật
    private fun loadEvents() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            getAllEventsUseCase(page = 1, limit = 20).collect { result ->
                when (result) {
                    is Result.Loading -> {
                        _isLoading.value = true
                    }
                    is Result.Success -> {
                        _isLoading.value = false
                        _events.value = result.data.map { it.toEventListItem() }
                    }
                    is Result.Failure -> {
                        _isLoading.value = false
                        _error.value = result.exception.message ?: "An unknown error occurred"
                    }
                }
            }
        }
    }

    // (YÊU CẦU 4) Hàm map dữ liệu từ Domain -> UI
    private fun Event.toEventListItem(): EventListItem {
        // Định dạng "Ngày tháng năm ⋅ Giờ:Phút"
        val dateString = "${formatTimestampToDay(this.date)} ${formatTimestampToMonth(this.date)}, ${formatTimestampToYear(this.date)}"
        val timeString = "${formatTimestampToHour(this.date)}:${formatTimestampToMinute(this.date)}"

        return EventListItem(
            title = this.name,
            dateTime = "$dateString ⋅ $timeString",
            location = this.location.ifEmpty { "${this.venueName}, ${this.city}" },
            imageUrl = this.imageUrl // <-- Dùng imageUrl (nằm dọc)
        )
    }

    fun onBackNavigationClick() {
        // Logic này sẽ được xử lý bởi NavController (nếu cần)
        println("Back navigation clicked")
    }

    fun onMoreOptionsClick() {
        // TODO: Implement more options functionality
        println("More options clicked")
    }

    fun onEventItemClick(event: EventListItem) {
        // TODO: Implement navigation to event details or other action
        println("Event clicked: ${event.title}")
    }
}