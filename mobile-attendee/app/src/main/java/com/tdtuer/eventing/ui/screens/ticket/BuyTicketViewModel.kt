package com.tdtuer.eventing.ui.screens.buyticket

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Promotion
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

data class TicketType(val name: String, val price: Double)

data class BuyTicketUiState(
    val ticketTypes: List<TicketType> = emptyList(),
    val selectedTicketType: TicketType = TicketType("", 0.0),
    val quantity: Int = 1,

    // --- Promotion State ---
    val voucherCode: String = "",
    val isCheckingVoucher: Boolean = false,
    val appliedVoucherCode: String? = null, // Mã đã áp dụng thành công
    val discountAmount: Double = 0.0,       // Số tiền được giảm
    val voucherMessage: String? = null,     // Thông báo kết quả

    // --- Danh sách voucher khả dụng ---
    val availablePromotions: List<Promotion> = emptyList(),
    val isShowPromoSheet: Boolean = false,

    val isLoading: Boolean = false,
    val errorMessage: String? = null
) {
    val ticketPrice: Double
        get() = selectedTicketType.price

    val subTotal: Double
        get() = selectedTicketType.price * quantity

    val finalTotalPrice: Double
        get() = (subTotal - discountAmount).coerceAtLeast(0.0)
}

@HiltViewModel
class BuyTicketViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val bookTicketUseCase: BookTicketUseCase,
    private val eventRepository: EventRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BuyTicketUiState())
    val uiState = _uiState.asStateFlow()

    private val _navigationEvent = Channel<NavigationEvent>()
    val navigationEvent = _navigationEvent.receiveAsFlow()

    sealed class NavigationEvent {
        data class GoToPayment(val ticketId: String) : NavigationEvent()
    }

    private val eventId: String = savedStateHandle.get<String>("eventId") ?: ""

    init {
        parseTicketOptions(savedStateHandle.get<String>("ticketTypes"))
        loadAvailablePromotions()
    }

    private fun loadAvailablePromotions() {
        viewModelScope.launch {
            eventRepository.getPublicPromotions().collect { result ->
                if (result is Result.Success) {
                    val validPromos = result.data.filter {
                        it.eventId == null || it.eventId == eventId
                    }
                    _uiState.update { it.copy(availablePromotions = validPromos) }
                }
            }
        }
    }

    fun showPromoSheet() { _uiState.update { it.copy(isShowPromoSheet = true) } }
    fun hidePromoSheet() { _uiState.update { it.copy(isShowPromoSheet = false) } }

    fun onPromotionSelected(promotion: Promotion) {
        _uiState.update { it.copy(voucherCode = promotion.code, isShowPromoSheet = false) }
        onApplyVoucher()
    }

    private fun parseTicketOptions(ticketDataString: String?) {
        if (ticketDataString.isNullOrEmpty()) {
            _uiState.update { it.copy(ticketTypes = emptyList()) }
            return
        }
        val ticketTypesList = ticketDataString.split('|').mapNotNull { part ->
            val details = part.split(':')
            if (details.size == 2) {
                TicketType(name = details[0], price = details[1].toDoubleOrNull() ?: 0.0)
            } else null
        }
        _uiState.update {
            it.copy(
                ticketTypes = ticketTypesList,
                selectedTicketType = ticketTypesList.firstOrNull() ?: TicketType("", 0.0)
            )
        }
    }

    fun onVoucherCodeChange(code: String) {
        _uiState.update { it.copy(voucherCode = code, voucherMessage = null) }
    }

    fun onApplyVoucher() {
        val code = _uiState.value.voucherCode
        val quantity = _uiState.value.quantity
        if (code.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isCheckingVoucher = true, voucherMessage = null) }

            val result = eventRepository.checkPromotion(code, eventId, quantity)

            if (result is Result.Success) {
                val promo = result.data
                val currentSubTotal = _uiState.value.subTotal
                var discount = 0.0

                if (promo.discountType == "percent") {
                    discount = currentSubTotal * (promo.discountValue ?: 0.0)
                } else {
                    discount = (promo.discountValue ?: 0.0)
                }

                discount = discount.coerceAtMost(currentSubTotal)

                _uiState.update {
                    it.copy(
                        isCheckingVoucher = false,
                        appliedVoucherCode = promo.code,
                        discountAmount = discount,
                        voucherMessage = "Áp dụng thành công: ${promo.message}"
                    )
                }
            } else {
                val errorMsg = (result as Result.Failure).exception.message
                _uiState.update {
                    it.copy(
                        isCheckingVoucher = false,
                        appliedVoucherCode = null,
                        discountAmount = 0.0,
                        voucherMessage = errorMsg
                    )
                }
            }
        }
    }

    fun onRemoveVoucher() {
        _uiState.update {
            it.copy(
                appliedVoucherCode = null,
                discountAmount = 0.0,
                voucherCode = "",
                voucherMessage = null
            )
        }
    }

    fun onTicketTypeSelected(type: TicketType) {
        _uiState.update { it.copy(selectedTicketType = type) }
        if (_uiState.value.appliedVoucherCode != null) {
            onApplyVoucher()
        }
    }

    // --- CẬP NHẬT LOGIC TĂNG/GIẢM SỐ LƯỢNG ---

    fun onIncreaseQuantity() {
        _uiState.update { it.copy(quantity = it.quantity + 1) }

        // Nếu đang có voucher, gọi lại để tính toán discount mới
        if (_uiState.value.appliedVoucherCode != null) {
            onApplyVoucher()
        }
    }

    fun onDecreaseQuantity() {
        _uiState.update {
            val newQuantity = (it.quantity - 1).coerceAtLeast(1)
            it.copy(quantity = newQuantity)
        }

        // Nếu đang có voucher, gọi lại để tính toán discount mới
        if (_uiState.value.appliedVoucherCode != null) {
            onApplyVoucher()
        }
    }

    fun onBackClick() { }
    fun onMoreOptionsClick() { }

    fun onContinueClick() {
        val currentState = uiState.value
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }

        viewModelScope.launch {
            val result = bookTicketUseCase(
                eventId = eventId,
                ticketType = currentState.selectedTicketType.name,
                quantity = currentState.quantity,
                promoCode = currentState.appliedVoucherCode
            )

            when (result) {
                is Result.Success<Ticket> -> {
                    val ticketId = result.data.id
                    _navigationEvent.send(NavigationEvent.GoToPayment(ticketId))
                    _uiState.update { it.copy(isLoading = false) }
                }
                is Result.Failure -> {
                    val msg = result.exception.message
                    val userMsg = if (msg?.contains("expired") == true) "Mã giảm giá đã hết hạn"
                    else if (msg?.contains("limit") == true) "Mã giảm giá đã hết lượt dùng"
                    else "Lỗi đặt vé: $msg"

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = userMsg
                        )
                    }
                }
                is Result.Loading -> {}
            }
        }
    }
}