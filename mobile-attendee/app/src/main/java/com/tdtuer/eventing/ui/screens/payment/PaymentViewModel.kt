package com.tdtuer.eventing.ui.screens.payment

import android.util.Log
import androidx.annotation.DrawableRes
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.payment.CreateZaloPayOrderUseCase
import com.tdtuer.eventing.domain.usecase.tickets.GetTicketDetailsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class PaymentMethod(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    @DrawableRes val logoRes: Int? = null,
    val cardDetails: String? = null
)

data class PaymentUiState(
    val isLoading: Boolean = false, // Loading chung (lấy vé hoặc tạo order)
    val paymentMethods: List<PaymentMethod> = emptyList(),
    val selectedMethod: PaymentMethod? = null,

    // Thông tin vé để hiển thị
    val totalAmount: Double = 0.0,
    val eventName: String = "",

    // State cho Card Sheet (Giữ nguyên nếu bạn muốn phát triển sau này)
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
    private val createZaloPayOrderUseCase: CreateZaloPayOrderUseCase,
    private val getTicketDetailsUseCase: GetTicketDetailsUseCase // Inject UseCase lấy chi tiết vé
) : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState = _uiState.asStateFlow()

    private val _paymentEvent = MutableSharedFlow<PaymentEvent>()
    val paymentEvent = _paymentEvent.asSharedFlow()

    val ticketId: String = savedStateHandle.get<String>("ticketId") ?: ""

    init {
        loadPaymentMethods()
        if (ticketId.isNotEmpty()) {
            loadTicketInfo()
        } else {
            // Xử lý lỗi nếu cần
        }
    }

    // Lấy thông tin vé để hiển thị số tiền cần trả
    private fun loadTicketInfo() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = getTicketDetailsUseCase(ticketId)) {
                is Result.Success -> {
                    val ticket = result.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            totalAmount = ticket.price, // Giá này là giá cuối cùng (đã trừ KM) từ server
                            eventName = ticket.eventName
                        )
                    }
                }

                is Result.Failure -> {
                    _uiState.update { it.copy(isLoading = false) }
                    _paymentEvent.emit(PaymentEvent.PaymentError("Can not load ticket information"))
                }

                is Result.Loading -> {}
            }
        }
    }

    private fun loadPaymentMethods() {
        val methods = listOf(
            PaymentMethod(name = "ZaloPay", logoRes = R.drawable.zalopay),
            // Thêm các method khác nếu cần
        )
        _uiState.update {
            it.copy(
                paymentMethods = methods,
                selectedMethod = methods.firstOrNull()
            )
        }
    }

    fun onPaymentMethodSelected(method: PaymentMethod) {
        _uiState.update { it.copy(selectedMethod = method) }
    }

    fun onCheckoutClick() {
        if (ticketId.isEmpty()) return

        val selectedMethod = uiState.value.selectedMethod?.name

        viewModelScope.launch {
            if (selectedMethod == "ZaloPay") {
                _uiState.update { it.copy(isLoading = true) }
                when (val result = createZaloPayOrderUseCase(ticketId)) {
                    is Result.Success -> {
                        _uiState.update { it.copy(isLoading = false) }
                        _paymentEvent.emit(PaymentEvent.RequestZaloPay(result.data.zpToken))
                    }

                    is Result.Failure -> {
                        _uiState.update { it.copy(isLoading = false) }
                        _paymentEvent.emit(
                            PaymentEvent.PaymentError(
                                result.exception.message ?: "Payment error"
                            )
                        )
                    }

                    is Result.Loading -> {}
                }
            } else {
                // Xử lý các phương thức khác
                _paymentEvent.emit(PaymentEvent.PaymentError("This method is not supported"))
            }
        }
    }

    fun onPaymentSuccess() {
        viewModelScope.launch {
            _paymentEvent.emit(PaymentEvent.PaymentSuccess(ticketId))
        }
    }

    // --- UI Events ---
    fun onBackClick() {}
    fun onCartClick() {}

    // Card Sheet Handlers (Giữ nguyên)
    fun onAddNewCardClick() {
        _uiState.update { it.copy(showAddNewCardSheet = true) }
    }

    fun onDismissAddNewCardSheet() {
        _uiState.update { it.copy(showAddNewCardSheet = false) }
    }

    fun onNewCardNumberChange(v: String) {
        _uiState.update { it.copy(newCardNumber = v) }
    }

    fun onNewCardExpiryChange(v: String) {
        _uiState.update { it.copy(newCardExpiry = v) }
    }

    fun onNewCardCvvChange(v: String) {
        _uiState.update { it.copy(newCardCvv = v) }
    }

    fun onSaveAsPrimaryChange(v: Boolean) {
        _uiState.update { it.copy(saveAsPrimary = v) }
    }

    fun onSaveCardContinueClick() {
        onDismissAddNewCardSheet()
    }
}