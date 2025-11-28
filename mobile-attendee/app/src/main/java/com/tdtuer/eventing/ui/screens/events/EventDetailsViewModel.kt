package com.tdtuer.eventing.ui.screens.events

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.data.repository.EventRepository
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

// 1. Cập nhật UI State để chứa danh sách gợi ý
data class EventDetailsUiState(
    val isLoading: Boolean = true,
    val event: Event? = null,
    val weather: Weather? = null,
    val recommendations: List<Event> = emptyList(), // <-- Thêm trường này
    val error: String? = null
)

@HiltViewModel
class EventDetailsViewModel @Inject constructor(
    private val getEventByIdUseCase: GetEventByIdUseCase,
    private val getEventWeatherUseCase: GetEventWeatherUseCase,
    private val eventRepository: EventRepository, // <-- Inject Repository để lấy recommendations
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val _uiState = MutableStateFlow(EventDetailsUiState())
    val uiState: StateFlow<EventDetailsUiState> = _uiState.asStateFlow()
    private val _navChannel = Channel<BuyTicketNavigation>()
    val navChannel = _navChannel.receiveAsFlow()
    private var currentEventId: String? = null

    sealed class BuyTicketNavigation {
        data class ToBuyTicket(val eventId: String, val ticketData: String) : BuyTicketNavigation()
    }

    init {
        val eventId: String? = savedStateHandle["eventId"]
        this.currentEventId = eventId

        if (eventId != null) {
            loadEventDetails(eventId)
            loadRecommendations(eventId) // <-- Gọi hàm load gợi ý
        } else {
            _uiState.value = EventDetailsUiState(
                isLoading = false,
                error = "Không tìm thấy ID của sự kiện."
            )
        }
    }

    /**
     * @param eventId: ID của sự kiện hiện tại (để có thể lọc bỏ khỏi danh sách gợi ý nếu cần)
     * @return: Unit (Cập nhật UI State)
     */
    private fun loadRecommendations(eventId: String) {
        viewModelScope.launch {
            // Lấy 6 sự kiện gợi ý
            eventRepository.getRecommendations(limit = 6).collect { result ->
                if (result is Result.Success) {
                    // Lọc bỏ sự kiện hiện tại khỏi danh sách gợi ý (nếu API trả về trùng)
                    val filteredList = result.data.filter { it.id != eventId }.take(6)
                    _uiState.update { it.copy(recommendations = filteredList) }
                }
                // Không cần xử lý lỗi nghiêm ngặt cho phần gợi ý, có thể để trống nếu lỗi
            }
        }
    }

    private fun loadEventDetails(eventId: String) {
        viewModelScope.launch {
            getEventByIdUseCase(eventId).collectLatest { result ->
                when (result) {
                    is Result.Loading -> {
                        _uiState.update { it.copy(isLoading = true) }
                    }

                    is Result.Success -> {
                        val event = result.data
                        _uiState.update { it.copy(isLoading = false, event = event) }

                        if (event.isOutdoor) {
                            loadWeather(eventId)
                        }
                    }

                    is Result.Failure -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = result.exception.message ?: "Đã xảy ra lỗi không xác định"
                            )
                        }
                    }
                }
            }
        }
    }

    private fun loadWeather(eventId: String) {
        viewModelScope.launch {
            getEventWeatherUseCase(eventId).collect { result ->
                if (result is Result.Success) {
                    _uiState.update { it.copy(weather = result.data) }
                }
            }
        }
    }

    // --- Actions ---

    fun onBackNavigationClick() {
        // Handled by UI
    }

    fun onBookmarkClick() {
        // TODO: Implement bookmark toggle logic
    }

    fun onInviteClick() {
        // TODO: Implement invite logic
    }

    fun onFollowOrganizerClick() {
        // TODO: Implement follow/unfollow organizer logic
    }

    fun onBuyTicketClick() {
        val event = _uiState.value.event ?: return
        val eventIdToSend = currentEventId ?: return

        val ticketDataString = event.ticketTypes.map { (name, details) ->
            val price = (details["price"] as? Number)?.toDouble() ?: 0.0
            "$name:$price"
        }.joinToString("|")

        viewModelScope.launch {
            _navChannel.send(BuyTicketNavigation.ToBuyTicket(event.id, ticketDataString))
        }
    }
}
