package com.tdtuer.eventing.ui.screens.buyticket

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// --- Data Models ---
data class TicketType(val name: String, val price: Double)

data class BuyTicketUiState(
    val ticketTypes: List<TicketType> = emptyList(),
    val selectedTicketType: TicketType = TicketType("", 0.0),
    val quantity: Int = 1
) {
    // Calculated property for the price of the selected ticket
    val ticketPrice: Double
        get() = selectedTicketType.price

    // Calculated property for the total price
    val totalPrice: Double
        get() = selectedTicketType.price * quantity
}


class BuyTicketViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(BuyTicketUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadTicketOptions()
    }

    private fun loadTicketOptions() {
        val ticketTypes = listOf(
            TicketType("VIP", 50.0),
            TicketType("Economy", 30.0)
        )
        _uiState.update {
            it.copy(
                ticketTypes = ticketTypes,
                selectedTicketType = ticketTypes.first(), // Default to VIP
                quantity = 5 // Initial quantity from the design
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
        _uiState.update { it.copy(quantity = it.quantity + 1) }
    }

    fun onDecreaseQuantity() {
        _uiState.update {
            val newQuantity = (it.quantity - 1).coerceAtLeast(1) // Quantity cannot go below 1
            it.copy(quantity = newQuantity)
        }
    }

    fun onContinueClick() {
        val finalSelection = uiState.value
        println(
            "Continue clicked: " +
                    "${finalSelection.quantity} x ${finalSelection.selectedTicketType.name} tickets. " +
                    "Total: ${finalSelection.totalPrice}"
        )
    }
}