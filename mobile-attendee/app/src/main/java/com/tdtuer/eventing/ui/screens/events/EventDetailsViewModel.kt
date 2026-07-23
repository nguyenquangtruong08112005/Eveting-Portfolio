package com.tdtuer.eventing.ui.screens.events

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Weather
import com.tdtuer.eventing.domain.usecase.events.GetEventByIdUseCase
import com.tdtuer.eventing.domain.usecase.events.GetEventWeatherUseCase
import com.tdtuer.eventing.domain.usecase.events.GetRecommendationsUseCase // Import UseCase
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

data class EventDetailsUiState(
    val isLoading: Boolean = true,
    val event: Event? = null,
    val weather: Weather? = null,
    val recommendations: List<Event> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class EventDetailsViewModel @Inject constructor(
    private val getEventByIdUseCase: GetEventByIdUseCase,
    private val getEventWeatherUseCase: GetEventWeatherUseCase,
    private val getRecommendationsUseCase: GetRecommendationsUseCase, // Inject UseCase thay Repository
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
            loadRecommendations(eventId)
        } else {
            _uiState.value = EventDetailsUiState(
                isLoading = false,
                error = "Không tìm thấy ID của sự kiện."
            )
        }
    }

    private fun loadRecommendations(eventId: String) {
        viewModelScope.launch {
            // Sử dụng UseCase
            getRecommendationsUseCase(limit = 6).collect { result ->
                if (result is Result.Success) {
                    val filteredList = result.data.filter { it.id != eventId }.take(6)
                    _uiState.update { it.copy(recommendations = filteredList) }
                }
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
                                error = com.tdtuer.eventing.helpers.UserFacingErrors.toUserMessage(result.exception)
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

    fun onBackNavigationClick() { }
    fun onBookmarkClick() { }
    fun onInviteClick() { }
    fun onFollowOrganizerClick() { }

    fun onBuyTicketClick() {
        val event = _uiState.value.event ?: return

        val ticketDataString = event.ticketTypes.map { (name, details) ->
            val price = (details["price"] as? Number)?.toDouble() ?: 0.0
            "$name:$price"
        }.joinToString("|")

        viewModelScope.launch {
            _navChannel.send(BuyTicketNavigation.ToBuyTicket(event.id, ticketDataString))
        }
    }
}