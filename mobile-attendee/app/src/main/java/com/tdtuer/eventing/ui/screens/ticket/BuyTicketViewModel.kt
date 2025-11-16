package com.tdtuer.eventing.ui.screens.buyticket

import android.util.Log
import androidx.compose.ui.platform.LocalGraphicsContext
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Ticket
import com.tdtuer.eventing.domain.usecase.payment.BookTicketUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// --- Data Models ---
data class TicketType(val name: String, val price: Double)

data class BuyTicketUiState(
    val ticketTypes: List<TicketType> = emptyList(),
    val selectedTicketType: TicketType = TicketType("", 0.0),
    val quantity: Int = 1,
    val isLoading: Boolean = false, // <-- Thêm trạng thái loading
    val errorMessage: String? = null // <-- Thêm trạng thái lỗi
) {
    // Calculated property for the price of the selected ticket
    val ticketPrice: Double
        get() = selectedTicketType.price

    // Calculated property for the total price
    val totalPrice: Double
        get() = selectedTicketType.price * quantity
}

@HiltViewModel
class BuyTicketViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val bookTicketUseCase: BookTicketUseCase // <-- (1) Inject UseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(BuyTicketUiState())
    val uiState = _uiState.asStateFlow()

    private val _navigationEvent = Channel<NavigationEvent>()
    val navigationEvent = _navigationEvent.receiveAsFlow()

    sealed class NavigationEvent {
        data class GoToPayment(val ticketId: String) : NavigationEvent()
    }

    private
    val eventId: String = savedStateHandle.get<String>("eventId") ?: ""


    init {
        parseTicketOptions(savedStateHandle.get<String>("ticketTypes")) // <-- GỌI HÀM PARSE
    }

    private fun parseTicketOptions(ticketDataString: String?) {
        if (ticketDataString.isNullOrEmpty()) {
            _uiState.update { it.copy(ticketTypes = emptyList()) }
            return
        }

        // Chuyển đổi "VIP:50.0|Economy:30.0" thành List<TicketType>
        val ticketTypesList = ticketDataString.split('|').mapNotNull { part ->
            val details = part.split(':')
            if (details.size == 2) {
                TicketType(name = details[0], price = details[1].toDoubleOrNull() ?: 0.0)
            } else {
                null
            }
        }

        _uiState.update {
            it.copy(
                ticketTypes = ticketTypesList,
                selectedTicketType = ticketTypesList.firstOrNull() ?: TicketType("", 0.0),
                quantity = 1 // Giữ nguyên số lượng là 1
            )
        }
    }

    // --- Event Handlers ---
    fun onBackClick() {
        println("Back clicked")
    }

    fun onMoreOptionsClick() {
        println("More options clicked")
    }

    fun onTicketTypeSelected(type: TicketType) {
        _uiState.update { it.copy(selectedTicketType = type) }
    }

    fun onIncreaseQuantity() {
//        _uiState.update { it.copy(quantity = it.quantity + 1) }
    }

    fun onDecreaseQuantity() {
        _uiState.update {
            val newQuantity = (it.quantity - 1).coerceAtLeast(1) // Quantity cannot go below 1
            it.copy(quantity = newQuantity)
        }
    }

    fun onContinueClick() {
        val finalSelection = uiState.value

        _uiState.update { it.copy(isLoading = true, errorMessage = null) }

        viewModelScope.launch {
            val result = bookTicketUseCase(
                eventId = eventId,
                ticketType = finalSelection.selectedTicketType.name,
                promoCode = null
            )

            when (result) {
                is Result.Success<Ticket> -> {
                    val ticketId = result.data.id
                    Log.d("BuyTicketViewModel", "Tạo vé pending thành công: $ticketId")
                    _navigationEvent.send(NavigationEvent.GoToPayment(ticketId))
                    _uiState.update { it.copy(isLoading = false) }
                }

                is Result.Failure -> {
                    // Thất bại, hiển thị lỗi
                    Log.e("BuyTicketViewModel", "Lỗi tạo vé: ${result.exception.message}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = result.exception.message ?: "Lỗi không xác định"
                        )
                    }
                }

                is Result.Loading -> {}
            }
        }
    }
}