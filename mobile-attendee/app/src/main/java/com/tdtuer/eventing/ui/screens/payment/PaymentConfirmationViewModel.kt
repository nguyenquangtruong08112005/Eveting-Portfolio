package com.tdtuer.eventing.ui.screens.paymentconfirmation

import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// --- Data Models ---
data class CardDetails(
    @DrawableRes val providerLogoRes: Int,
    val brandName: String,
    val lastFourDigits: String,
    val maskedNumber: String,
    val cardholderName: String,
    val expiryDate: String
)

data class Voucher(
    val code: String,
    val discount: String
)

data class PaymentConfirmationUiState(
    val selectedCard: CardDetails? = null,
    val appliedVoucher: Voucher? = null
)

class PaymentConfirmationViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentConfirmationUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadPaymentDetails()
    }

    private fun loadPaymentDetails() {
        // In a real app, this data would be passed from the previous screen
        val card = CardDetails(
            providerLogoRes = R.drawable.google, // Replace with your logo
            brandName = "VISA",
            lastFourDigits = "3090",
            maskedNumber = "**** **** **** 3090",
            cardholderName = "Peter Crouch",
            expiryDate = "09/24"
        )
        val voucher = Voucher(
            code = "Eventory25",
            discount = "25% off"
        )
        _uiState.value = PaymentConfirmationUiState(
            selectedCard = card,
            appliedVoucher = voucher
        )
    }

    // --- Event Handlers ---
    fun onBackClick() {
        println("Back clicked")
    }

    fun onRemoveVoucherClick() {
        _uiState.update { it.copy(appliedVoucher = null) }
        println("Voucher removed")
    }

    fun onConfirmClick() {
        println("Payment confirmed for card ending in: ${_uiState.value.selectedCard?.lastFourDigits}")
    }
}