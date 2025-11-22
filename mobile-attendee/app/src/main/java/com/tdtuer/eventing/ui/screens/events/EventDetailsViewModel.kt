package com.tdtuer.eventing.ui.screens.events

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Weather
import com.tdtuer.eventing.domain.usecase.events.GetEventByIdUseCase
import com.tdtuer.eventing.domain.usecase.events.GetEventWeatherUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// 1. Định nghĩa UI State mới để quản lý các trạng thái
data class EventDetailsUiState(
    val isLoading: Boolean = true,
    val event: Event? = null,
    val weather: Weather? = null, // Thêm trường này
    val error: String? = null
)

@HiltViewModel
class EventDetailsViewModel @Inject constructor(
    private val getEventByIdUseCase: GetEventByIdUseCase, // Tiêm UseCase
    private val getEventWeatherUseCase: GetEventWeatherUseCase, // Inject thêm
    savedStateHandle: SavedStateHandle // Tiêm SavedStateHandle
) : ViewModel() {

    // 2. Sử dụng StateFlow cho UI State
    private val _uiState = MutableStateFlow(EventDetailsUiState())
    val uiState: StateFlow<EventDetailsUiState> = _uiState.asStateFlow()
    private val _navChannel = Channel<BuyTicketNavigation>()
    val navChannel = _navChannel.receiveAsFlow()
    private var currentEventId: String? = null

    sealed class BuyTicketNavigation {
        data class ToBuyTicket(val eventId: String, val ticketData: String) : BuyTicketNavigation()
    }

    init {
        // 3. Lấy eventId từ navigation arguments
        val eventId: String? = savedStateHandle["eventId"]

        this.currentEventId = eventId

        if (eventId != null) {
            loadEventDetails(eventId)
        } else {
            _uiState.value = EventDetailsUiState(
                isLoading = false,
                error = "Không tìm thấy ID của sự kiện."
            )
        }
    }

    // 4. Hàm gọi UseCase để lấy dữ liệu thật
    private fun loadEventDetails(eventId: String) {
        viewModelScope.launch {
            getEventByIdUseCase(eventId).collectLatest { result ->
                when (result) {
                    is Result.Loading -> {
                        _uiState.value = EventDetailsUiState(isLoading = true)
                    }

                    is Result.Success -> {
                        val event = result.data
                        _uiState.update { it.copy(isLoading = false, event = event) }

                        // 2. Nếu là sự kiện ngoài trời -> Load Weather
                        if (event.isOutdoor) {
                            loadWeather(eventId)
                        }
                    }

                    is Result.Failure -> {
                        _uiState.value = EventDetailsUiState(
                            isLoading = false,
                            error = result.exception.message ?: "Đã xảy ra lỗi không xác định"
                        )
                    }
                }
            }
        }
    }

    private fun loadWeather(eventId: String) {
        viewModelScope.launch {
            getEventWeatherUseCase(eventId).collect { result ->
                if (result is Result.Success) {
                    Log.d("EventDetailsViewModel", result.data.toString())
                    _uiState.update { it.copy(weather = result.data) }
                }
            }
        }
    }

    // --- Các trình xử lý sự kiện (Event Handlers) giữ nguyên ---

    fun onBackNavigationClick() {
        // TODO: Implement back navigation logic (thường là navController.popBackStack())
        println("Back navigation clicked")
    }

    fun onBookmarkClick() {
        // TODO: Implement bookmark toggle logic
        println("Bookmark clicked")
    }

    fun onInviteClick() {
        // TODO: Implement invite logic
        println("Invite clicked")
    }

    fun onFollowOrganizerClick() {
        // TODO: Implement follow/unfollow organizer logic
        println("Follow organizer clicked")
    }

    fun onBuyTicketClick() {
        val event = _uiState.value.event ?: return

        val eventIdToSend = currentEventId
        if (eventIdToSend.isNullOrEmpty()) {
            Log.e("EventDetailsViewModel", "Không thể điều hướng, eventId gốc bị rỗng!")
            return // Không làm gì nếu eventId gốc không hợp lệ
        }
        // 1. Chuyển đổi Map<String, Map<String, Any>> phức tạp
        // thành một chuỗi đơn giản: "VIP:50.0|Economy:30.0"
        val ticketDataString = event.ticketTypes.map { (name, details) ->
            val price = (details["price"] as? Number)?.toDouble() ?: 0.0
            "$name:$price" // Ghép Tên:Giá
        }.joinToString("|") // Nối các loại vé bằng dấu |
        Log.d("EventDetailsViewModel", "Ticket Data String: $ticketDataString")
        // 2. Gửi sự kiện điều hướng chứa ID và chuỗi dữ liệu vé
        viewModelScope.launch {
            _navChannel.send(BuyTicketNavigation.ToBuyTicket(event.id, ticketDataString))
        }
    }
}