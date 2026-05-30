package com.tdtuer.eventing.ui.screens.ticket

import com.tdtuer.eventing.domain.model.Promotion

/**
 * UI State cho màn hình mua vé.
 */
data class BuyTicketUiState(
    val ticketTypes: List<TicketType> = emptyList(),
    val selectedTicketType: TicketType = TicketType("", 0.0),
    val quantity: Int = 1,

    // --- Promotion State ---
    val voucherCode: String = "",
    val isCheckingVoucher: Boolean = false,
    val appliedVoucherCode: String? = null,
    val discountAmount: Double = 0.0,
    val voucherMessage: String? = null,

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

data class TicketType(val name: String, val price: Double)

/**
 * Các sự kiện điều hướng từ ViewModel (One-time events).
 */
sealed class BuyTicketNavigationEvent {
    data class GoToPayment(val ticketId: String) : BuyTicketNavigationEvent()
}