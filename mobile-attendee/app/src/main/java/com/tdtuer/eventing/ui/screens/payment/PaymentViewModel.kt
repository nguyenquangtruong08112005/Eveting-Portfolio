package com.tdtuer.eventing.ui.screens.payment

import android.util.Log
import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.payment.CreateZaloPayOrderUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import kotlinx.coroutines.launch
import androidx.navigation.NavController
import com.tdtuer.eventing.ui.navigation.Graph
import com.tdtuer.eventing.ui.navigation.Screen

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
sealed class PaymentEvent {
    data class RequestZaloPay(val zpToken: String) : PaymentEvent()
    data class PaymentError(val message: String) : PaymentEvent()
    data class PaymentSuccess(val ticketId: String) : PaymentEvent()

}
@HiltViewModel
class PaymentViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val createZaloPayOrderUseCase: CreateZaloPayOrderUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState = _uiState.asStateFlow()

    private val _paymentEvent = MutableSharedFlow<PaymentEvent>()
    val paymentEvent = _paymentEvent.asSharedFlow()

    val ticketId: String = savedStateHandle.get<String>("ticketId") ?: ""

    init {
        loadPaymentMethods()
        if (ticketId.isEmpty()) {
            // Xử lý lỗi: Không có ticketId, không thể thanh toán
            Log.e("PaymentViewModel", "Lỗi nghiêm trọng: ticketId bị rỗng!")
        }
    }

    private fun loadPaymentMethods() {
        val methods = listOf(
            PaymentMethod(name = "ZaloPay", logoRes = R.drawable.zalopay),
//            PaymentMethod(name = "PayPal", logoRes = R.drawable.google),
//            PaymentMethod(name = "Google Pay", logoRes = R.drawable.google),
//            PaymentMethod(
//                name = "Pay by Debit/ Credit Card",
//                logoRes = R.drawable.banner_svgrepo_com,
//                cardDetails = "•••• •••• •••• 0231"
//            )
        )
        _uiState.update {
            it.copy(
                paymentMethods = methods,
                selectedMethod = methods.first()
            )
        }
    }

    // --- Main Screen Event Handlers ---
    fun onBackClick() {
        println("Back clicked")
    }

    fun onCartClick() {
        println("Cart clicked")
    }

    fun onPaymentMethodSelected(method: PaymentMethod) {
        _uiState.update { it.copy(selectedMethod = method) }
    }

    fun onVoucherCodeChanged(newCode: String) {
        _uiState.update { it.copy(voucherCode = newCode) }
    }

    fun onApplyVoucherClick() {
        println("Applying voucher: ${uiState.value.voucherCode}")
    }

    fun onCheckoutClick() {
        val selectedMethod = uiState.value.selectedMethod?.name

        Log.d("PaymentViewModel", "Ticket ID: $ticketId")

        if (ticketId.isEmpty()) {
            viewModelScope.launch {
                _paymentEvent.emit(PaymentEvent.PaymentError("Lỗi: Không tìm thấy mã vé."))
            }
            return
        }

        when (selectedMethod) {
            "ZaloPay" -> {
                viewModelScope.launch {
                    when (val result = createZaloPayOrderUseCase(ticketId)) {
                        is Result.Success -> {
                            Log.d("PaymentViewModel", "ZaloPay token: ${result.data.zpToken}")
                            _paymentEvent.emit(PaymentEvent.RequestZaloPay(result.data.zpToken))
                        }

                        is Result.Failure -> {
                            _paymentEvent.emit(
                                PaymentEvent.PaymentError(
                                    result.exception.message ?: "Lỗi ZaloPay"
                                )
                            )
                        }

                        is Result.Loading -> {} // (UseCase của chúng ta không emit Loading)
                    }
                }
            }

            "MoMo" -> {
                // TODO: Gọi CreateMoMoOrderUseCase(ticketId)
            }

            else -> {
                println("Checkout clicked with method: $selectedMethod")
                // TODO: Điều hướng sang luồng thanh toán thẻ
            }
        }
    }

    // --- "Add New Card" Sheet Handlers ---
    fun onAddNewCardClick() {
        _uiState.update { it.copy(showAddNewCardSheet = true) }
    }

    fun onDismissAddNewCardSheet() {
        _uiState.update { it.copy(showAddNewCardSheet = false) }
    }

    fun onNewCardNumberChange(value: String) {
        _uiState.update { it.copy(newCardNumber = value) }
    }

    fun onNewCardExpiryChange(value: String) {
        _uiState.update { it.copy(newCardExpiry = value) }
    }

    fun onNewCardCvvChange(value: String) {
        _uiState.update { it.copy(newCardCvv = value) }
    }

    fun onSaveAsPrimaryChange(isChecked: Boolean) {
        _uiState.update { it.copy(saveAsPrimary = isChecked) }
    }

    fun onSaveCardContinueClick() {
        println("Saving new card: Number=${uiState.value.newCardNumber}, Expiry=${uiState.value.newCardExpiry}")
        onDismissAddNewCardSheet()
    }

    fun onPaymentSuccess() {
        if (ticketId.isNotEmpty()) {
            viewModelScope.launch {
                // Chỉ cần phát sự kiện. Không cần NavController.
                _paymentEvent.emit(PaymentEvent.PaymentSuccess(ticketId))
            }
        } else {
            Log.e("PaymentViewModel", "Payment success nhưng ticketId rỗng!")
        }
    }
}