package com.tdtuer.eventing.helpers

import java.text.NumberFormat
import java.util.Locale

fun formatDisplayPrice(ticketTypes: Map<String, Map<String, Any>>): String {
    if (ticketTypes.isEmpty()) return "Not available"

    // 1. Lấy tất cả các giá (price) từ trong Map
    val prices = ticketTypes.values
        .mapNotNull { it["price"] as? Number }
        .map { it.toDouble() }

    if (prices.isEmpty()) return "Not available"

    // 2. Tìm giá thấp nhất
    val minPrice = prices.minOrNull() ?: 0.0

    // 3. Định dạng
    return when {
        minPrice > 0 -> {
            // Định dạng tiền tệ (ví dụ: 150.000đ)
            val formatter = NumberFormat.getCurrencyInstance(Locale("vi", "VN"))
            "Starts at ${formatter.format(minPrice)}"
        }
        else -> "Free"
    }
}