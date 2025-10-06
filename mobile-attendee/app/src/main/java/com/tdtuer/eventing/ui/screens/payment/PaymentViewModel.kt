package com.tdtuer.eventing.ui.screens.payment

import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID

// --- Data Models ---
data class PaymentMethod(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    @DrawableRes val logoRes: Int? = null,
    val cardDetails: String? = null
)

data class PaymentUiState(
    val paymentMethods: List<PaymentMethod> = emptyList(),
    val selectedMethod: PaymentMethod? = null,
    val voucherCode: String = "",

    // State for the "Add New Card" sheet
    val showAddNewCardSheet: Boolean = false,
    val newCardNumber: String = "",
    val newCardExpiry: String = "",
    val newCardCvv: String = "",
    val saveAsPrimary: Boolean = true
)


class PaymentViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadPaymentMethods()
    }

    private fun loadPaymentMethods() {
        val methods = listOf(
            PaymentMethod(name = "Apple Pay", logoRes = R.drawable.google),
            PaymentMethod(name = "PayPal", logoRes = R.drawable.google),
            PaymentMethod(name = "Google Pay", logoRes = R.drawable.google),
            PaymentMethod(
                name = "Pay by Debit/ Credit Card",
                logoRes = R.drawable.banner_svgrepo_com,
                cardDetails = "•••• •••• •••• 0231"
            )
        )
        _uiState.update {
            it.copy(
                paymentMethods = methods,
                selectedMethod = methods.first()
            )
        }
    }

    // --- Main Screen Event Handlers ---
    fun onBackClick() { println("Back clicked") }
    fun onCartClick() { println("Cart clicked") }
    fun onPaymentMethodSelected(method: PaymentMethod) { _uiState.update { it.copy(selectedMethod = method) } }
    fun onVoucherCodeChanged(newCode: String) { _uiState.update { it.copy(voucherCode = newCode) } }
    fun onApplyVoucherClick() { println("Applying voucher: ${uiState.value.voucherCode}") }
    fun onCheckoutClick() { println("Checkout clicked with method: ${uiState.value.selectedMethod?.name}") }

    // --- "Add New Card" Sheet Handlers ---
    fun onAddNewCardClick() {
        _uiState.update { it.copy(showAddNewCardSheet = true) }
    }

    fun onDismissAddNewCardSheet() {
        _uiState.update { it.copy(showAddNewCardSheet = false) }
    }

    fun onNewCardNumberChange(value: String) { _uiState.update { it.copy(newCardNumber = value) } }
    fun onNewCardExpiryChange(value: String) { _uiState.update { it.copy(newCardExpiry = value) } }
    fun onNewCardCvvChange(value: String) { _uiState.update { it.copy(newCardCvv = value) } }
    fun onSaveAsPrimaryChange(isChecked: Boolean) { _uiState.update { it.copy(saveAsPrimary = isChecked) } }

    fun onSaveCardContinueClick() {
        println("Saving new card: Number=${uiState.value.newCardNumber}, Expiry=${uiState.value.newCardExpiry}")
        onDismissAddNewCardSheet()
    }
}