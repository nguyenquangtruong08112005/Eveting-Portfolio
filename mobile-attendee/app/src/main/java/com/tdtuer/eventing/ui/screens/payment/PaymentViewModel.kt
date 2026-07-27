package com.tdtuer.eventing.ui.screens.payment

import android.util.Log
import androidx.annotation.DrawableRes
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.payment.CheckPaymentStatusUseCase
import com.tdtuer.eventing.domain.usecase.payment.CreateZaloPayOrderUseCase
import com.tdtuer.eventing.domain.usecase.tickets.GetTicketDetailsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
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
    val isLoading: Boolean = false,
    val paymentMethods: List<PaymentMethod> = emptyList(),
    val selectedMethod: PaymentMethod? = null,

    // Thông tin vé để hiển thị
    val totalAmount: Double = 0.0,
    val eventName: String = "",

    // Trạng thái thanh toán
    val paymentStatus: String? = null, // null, 'paid', 'failed', 'cancelled', 'pending'
    val paymentMessage: String? = null,
    val paymentInProgress: Boolean = false, // disables checkout throughout order creation, SDK open, polling, manual refresh
    val isConfirmingPayment: Boolean = false, // true khi đang poll
    val pollAttempts: Int = 0,

    // State cho Card Sheet
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
    data class PendingConfirmation(val ticketId: String) : PaymentEvent()
}

@HiltViewModel
class PaymentViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val createZaloPayOrderUseCase: CreateZaloPayOrderUseCase,
    private val checkPaymentStatusUseCase: CheckPaymentStatusUseCase,
    private val getTicketDetailsUseCase: GetTicketDetailsUseCase // Inject UseCase lấy chi tiết vé
) : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState = _uiState.asStateFlow()

    private val _paymentEvent = MutableSharedFlow<PaymentEvent>()
    val paymentEvent = _paymentEvent.asSharedFlow()

    val ticketId: String = savedStateHandle.get<String>("ticketId") ?: ""

    private var pollingJob: Job? = null

    companion object {
        private const val POLL_INTERVAL_MS = 3000L
        private const val MAX_POLL_ATTEMPTS = 8
    }

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
        if (ticketId.isEmpty() || uiState.value.paymentInProgress) return

        val selectedMethod = uiState.value.selectedMethod?.name

        viewModelScope.launch {
            if (selectedMethod == "ZaloPay") {
                _uiState.update { it.copy(isLoading = true, paymentInProgress = true) }
                when (val result = createZaloPayOrderUseCase(ticketId)) {
                    is Result.Success -> {
                        _uiState.update { it.copy(isLoading = false) }
                        _paymentEvent.emit(PaymentEvent.RequestZaloPay(result.data.zpToken))
                    }

                    is Result.Failure -> {
                        _uiState.update { it.copy(isLoading = false, paymentInProgress = false) }
                        _paymentEvent.emit(
                            PaymentEvent.PaymentError(
                                result.exception.message ?: "Payment error"
                            )
                        )
                    }

                    is Result.Loading -> {}
                }
            } else {
                _paymentEvent.emit(PaymentEvent.PaymentError("This method is not supported"))
            }
        }
    }

    /** Called when ZaloPay SDK reports user cancelled */
    fun onPaymentCanceled() {
        _uiState.update { it.copy(paymentInProgress = false) }
    }

    /** Called when ZaloPay SDK reports an error */
    fun onPaymentErrorOccurred() {
        _uiState.update { it.copy(paymentInProgress = false) }
    }

    fun onPaymentSuccess() {
        // ZaloPay SDK reported success — begin polling backend for confirmation
        startPolling()
    }

    private fun startPolling() {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            _uiState.update { it.copy(isConfirmingPayment = true, pollAttempts = 0) }
            _paymentEvent.emit(PaymentEvent.PendingConfirmation(ticketId))
            pollForConfirmation()
        }
    }

    private suspend fun pollForConfirmation() {
        for (attempt in 1..MAX_POLL_ATTEMPTS) {
            delay(POLL_INTERVAL_MS)
            _uiState.update { it.copy(pollAttempts = attempt) }

            when (val result = checkPaymentStatusUseCase(ticketId)) {
                is Result.Success -> {
                    val status = result.data.status
                    when (status) {
                        "paid" -> {
                            _uiState.update { it.copy(
                                isConfirmingPayment = false,
                                paymentInProgress = false,
                                paymentStatus = "paid"
                            )}
                            _paymentEvent.emit(PaymentEvent.PaymentSuccess(ticketId))
                            return
                        }
                        "failed", "cancelled" -> {
                            _uiState.update { it.copy(
                                isConfirmingPayment = false,
                                paymentInProgress = false,
                                paymentStatus = status,
                                paymentMessage = result.data.message
                            )}
                            _paymentEvent.emit(PaymentEvent.PaymentError(
                                result.data.message ?: "Payment $status"
                            ))
                            return
                        }
                    }
                }
                is Result.Failure -> {
                    Log.w("PaymentVM", "Poll attempt $attempt failed: ${result.exception.message}")
                }
                is Result.Loading -> {}
            }
        }

        // All 8 attempts exhausted without terminal status — pending-confirmation state
        _uiState.update { it.copy(
            isConfirmingPayment = false,
            paymentStatus = "pending",
            paymentMessage = "Payment confirmation is taking longer than expected"
        )}
        _paymentEvent.emit(PaymentEvent.PendingConfirmation(ticketId))
    }

    fun onManualRefresh() {
        // Bounded manual refresh — single check-status call, no automatic retry, no re-opening ZaloPay
        if (uiState.value.isConfirmingPayment) return
        viewModelScope.launch {
            _uiState.update { it.copy(isConfirmingPayment = true, paymentInProgress = true) }
            when (val result = checkPaymentStatusUseCase(ticketId)) {
                is Result.Success -> {
                    val status = result.data.status
                    when (status) {
                        "paid" -> {
                            _uiState.update { it.copy(
                                isConfirmingPayment = false,
                                paymentInProgress = false,
                                paymentStatus = "paid"
                            )}
                            _paymentEvent.emit(PaymentEvent.PaymentSuccess(ticketId))
                            return@launch
                        }
                        "failed", "cancelled" -> {
                            _uiState.update { it.copy(
                                isConfirmingPayment = false,
                                paymentInProgress = false,
                                paymentStatus = status,
                                paymentMessage = result.data.message
                            )}
                            _paymentEvent.emit(PaymentEvent.PaymentError(
                                result.data.message ?: "Payment $status"
                            ))
                            return@launch
                        }
                    }
                }
                is Result.Failure -> {
                    Log.w("PaymentVM", "Manual refresh failed: ${result.exception.message}")
                }
                is Result.Loading -> {}
            }
            _uiState.update { it.copy(isConfirmingPayment = false, paymentInProgress = false) }
        }
    }

    override fun onCleared() {
        super.onCleared()
        pollingJob?.cancel()
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