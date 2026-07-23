package com.tdtuer.eventing.helpers

import java.text.NumberFormat
import java.util.Locale

fun formatDisplayPrice(minPrice: Double?): String {
    return when {

        minPrice == null -> "Free"

        minPrice > 0 -> {
            val formatter = NumberFormat.getCurrencyInstance(Locale("vi", "VN"))
            "Starts at ${formatter.format(minPrice)}"
        }

        else -> "Free"
    }
}

// *** HELPER ĐỊNH DẠNG TIỀN TỆ (VNĐ) ***
// (Vì formatDisplayPrice thêm "Starts at", chúng ta cần hàm này cho TicketTypeRow)
fun formatVNCurrency(price: Double): String {
    if (price == 0.0) return "Free" // Giữ "Free" cho 0
    val formatter = NumberFormat.getCurrencyInstance(Locale("vi", "VN"))
    return formatter.format(price)
}