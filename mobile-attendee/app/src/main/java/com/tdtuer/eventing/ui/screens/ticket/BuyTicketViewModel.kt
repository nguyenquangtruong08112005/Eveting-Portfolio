package com.tdtuer.eventing.ui.screens.buyticket

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Promotion // Import Promotion Domain
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Ticket
import com.tdtuer.eventing.domain.usecase.payment.BookTicketUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
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
    val voucherMessage: String? = null,     // Thông báo (Lỗi hoặc thành công)

    // --- MỚI: State cho danh sách voucher ---
    val availablePromotions: List<Promotion> = emptyList(),
    val isShowPromoSheet: Boolean = false,
    // ---------------------------------------

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
    private val eventRepository: EventRepository // Inject Repository
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
        loadAvailablePromotions() // <-- Load voucher ngay khi vào
    }

    private fun loadAvailablePromotions() {
        viewModelScope.launch {
            eventRepository.getPublicPromotions().collectLatest { result ->
                if (result is Result.Success) {
                    // Lọc: Chỉ lấy voucher áp dụng cho toàn bộ (eventId=null) hoặc đúng event này
                    val validPromos = result.data.filter {
                        it.eventId == null || it.eventId == eventId
                    }
                    _uiState.update { it.copy(availablePromotions = validPromos) }
                }
            }
        }
    }

    // Điều khiển BottomSheet
    fun showPromoSheet() { _uiState.update { it.copy(isShowPromoSheet = true) } }
    fun hidePromoSheet() { _uiState.update { it.copy(isShowPromoSheet = false) } }

    // Khi chọn voucher từ danh sách -> Tự động điền và Apply
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

    // --- VOUCHER LOGIC ---

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
                // Tính toán giảm giá
                val currentSubTotal = _uiState.value.subTotal
                var discount = 0.0

                if (promo.discountType == "percent") {
                    discount = currentSubTotal * (promo.discountValue ?: 0.0)
                } else {
                    discount = (promo.discountValue ?: 0.0)
                }

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

    // --- STANDARD LOGIC ---

    fun onBackClick() { }
    fun onMoreOptionsClick() { }

    fun onTicketTypeSelected(type: TicketType) {
        // Reset discount khi đổi loại vé để tính lại chính xác
        _uiState.update {
            it.copy(selectedTicketType = type, discountAmount = 0.0, appliedVoucherCode = null, voucherMessage = null)
        }
    }

    fun onIncreaseQuantity() {
        // Logic này đang comment ở code cũ, nếu mở lại, nhớ reset voucher
    }

    fun onDecreaseQuantity() {
        _uiState.update {
            val newQuantity = (it.quantity - 1).coerceAtLeast(1)
            it.copy(quantity = newQuantity, discountAmount = 0.0, appliedVoucherCode = null, voucherMessage = null)
        }
    }

    fun onContinueClick() {
        val currentState = uiState.value
        _uiState.update { it.copy(isLoading = true, errorMessage = null) }

        viewModelScope.launch {
            // Gửi kèm promoCode khi đặt vé
            val result = bookTicketUseCase(
                eventId = eventId,
                ticketType = currentState.selectedTicketType.name,
                promoCode = currentState.appliedVoucherCode // <--- GỬI CODE Ở ĐÂY
            )

            when (result) {
                is Result.Success<Ticket> -> {
                    val ticketId = result.data.id
                    _navigationEvent.send(NavigationEvent.GoToPayment(ticketId))
                    _uiState.update { it.copy(isLoading = false) }
                }
                is Result.Failure -> {
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